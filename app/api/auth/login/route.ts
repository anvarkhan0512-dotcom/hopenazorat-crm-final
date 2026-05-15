import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { Student } from '@/models/Student';
import { Center } from '@/models/Center';
import { LoginHistory } from '@/models/LoginHistory';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not defined');
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not defined, using fallback');
}

/** Login uchun telefon variantlari (phones[0] / phone bilan solishtirish) */
function phoneLoginVariants(raw: string): string[] {
  const t = raw.replace(/\s+/g, '');
  const noPlus = t.replace(/^\+/, '');
  const digits = noPlus.replace(/\D/g, '');
  return Array.from(new Set([t, noPlus, digits].filter(Boolean)));
}

export const dynamic = 'force-dynamic';

// Agar .env faylda JWT_SECRET bo'lmasa, vaqtincha shu kalit ishlatiladi
const JWT_SECRET = process.env.JWT_SECRET || 'edu-crm-secret-key-2024';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // 1. Frontenddan kelayotgan ma'lumotni o'qish
    const body = await request.json();
    const { username, password, expectedRole } = body;

    const roleMatches = (role: string, expected: string | undefined) => {
      if (role === 'boss') return true;
      if (!expected || typeof expected !== 'string') return true;
      const e = expected.trim();
      if (e === 'center') return role === 'admin' || role === 'manager';
      return role === e;
    };

    // 2. Foydalanuvchini bazadan qidirish (Trim - bo'sh joylarni olib tashlaydi)
    const rawUsername = String(username ?? '').trim();
    const normalizedUsername = rawUsername.replace(/\s+/g, '');
    const phoneUsername = normalizedUsername.replace(/^\+/, '');

    let user =
      (await User.findOne({ username: rawUsername })) ||
      (await User.findOne({ username: normalizedUsername })) ||
      (await User.findOne({ username: phoneUsername }));

    /** Ota-ona farzand kartasidagi birinchi telefon (phones[0]) bilan kirsa — bogʻlangan parent User */
    if (!user && expectedRole === 'parent') {
      const variants = phoneLoginVariants(phoneUsername || rawUsername);
      if (variants.length) {
        const linkedStudent = await Student.findOne({
          status: 'active',
          parentUserId: { $exists: true, $ne: null },
          $or: [
            { 'phones.0': { $in: variants } },
            {
              $and: [
                { $or: [{ phones: { $exists: false } }, { phones: { $size: 0 } }] },
                { phone: { $in: variants } },
              ],
            },
          ],
        })
          .select('parentUserId')
          .lean();

        if (linkedStudent?.parentUserId) {
          user = await User.findById(linkedStudent.parentUserId);
        } else {
          /** Agar boshqa raqam bilan kirmoqchi bo'lsa (phones[1] va h.k.) */
          const secondaryMatch = await Student.findOne({
            status: 'active',
            parentUserId: { $exists: true, $ne: null },
            phones: { $in: variants },
            'phones.0': { $not: { $in: variants } },
          })
            .select('_id')
            .lean();

          if (secondaryMatch) {
            return NextResponse.json(
              {
                error: 'Faqat asosiy raqam bilan kirish mumkin',
                code: 'PRIMARY_PHONE_ONLY',
              },
              { status: 401 }
            );
          }
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Foydalanuvchi topilmadi', code: 'USER_NOT_FOUND' },
        { status: 401 }
      );
    }

    // 3. Parolni tekshirish
    const rawPassword = String(password ?? '');
    let isValidPassword = await bcrypt.compare(rawPassword, user.password);
    // Legacy support: if old users were saved with plain-text password, allow once and migrate.
    if (!isValidPassword && user.password === rawPassword) {
      isValidPassword = true;
      try {
        user.password = await bcrypt.hash(rawPassword, 10);
        await user.save();
      } catch (e) {
        console.error('Password migration failed:', e);
      }
    }

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Parol noto‘g‘ri', code: 'WRONG_PASSWORD' },
        { status: 401 }
      );
    }

    if (!roleMatches(user.role, expectedRole)) {
      return NextResponse.json(
        { error: 'Tanlangan rol bilan akkaunt mos kelmaydi', code: 'ROLE_MISMATCH' },
        { status: 403 }
      );
    }

    // Check center block/trial status
    if (user.centerId) {
      const center = await Center.findById(user.centerId);
      
      // Auto-check trial expiration
      if (center?.trialEndsAt && new Date() > new Date(center.trialEndsAt) && !center.isBlocked) {
        await Center.findByIdAndUpdate(user.centerId, { 
          isBlocked: true,
          blockReason: 'Trial muddati tugadi'
        });
        center.isBlocked = true;
      }

      if (center?.isBlocked) {
        const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
        if (isAdminOrManager) {
          return NextResponse.json({
            error: 'blocked',
            message: 'Muddatingiz tugadi. To\'lov qiling.',
            phone: '+998901234567',
            price: '299,000 so\'m/oy'
          }, { status: 403 });
        } else {
          return NextResponse.json({
            error: 'center_blocked',
            message: 'Tizim yopiq. Markazingiz bilan bog\'laning.'
          }, { status: 403 });
        }
      }
    }

    // 4. JWT Token yaratish
    let centerName = 'O\'quv markaz';
    if (user.centerId) {
      const center = await Center.findById(user.centerId).select('name').lean();
      if (center?.name) centerName = center.name;
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        centerId: user.centerId || null,
        centerName: centerName,
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 7 kunlik muddat
    );

    // 4.1 Check if student is blocked
    if (user.role === 'student' || user.role === 'parent') {
      let student = null;
      if (user.role === 'student') {
        student = await Student.findOne({ studentUserId: user._id });
      } else if (user.role === 'parent') {
        student = await Student.findOne({ parentUserId: user._id });
      }

      if (student?.isBlocked) {
        return NextResponse.json(
          {
            error: "⚠️ Qarzdorligingiz bor. Administratsiyaga bog'laning.\nQarzdorlik muddati o'tib ketgan.",
            code: 'STUDENT_BLOCKED',
            reason: student.blockReason
          },
          { status: 403 }
        );
      }
    }

    // 5. Muvaffaqiyatli javob va Cookie sozlamalari
    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        displayName: user.displayName || '',
        avatarUrl: user.avatarUrl || '',
      },
    });

    // 5.1 Save Login History
    try {
      await LoginHistory.create({
        userId: user._id,
        timestamp: new Date(),
        userAgent: request.headers.get('user-agent') || '',
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '0.0.0.0'
      });
    } catch (historyErr) {
      console.error('Failed to save login history:', historyErr);
    }

    // Tokenni brauzer cookie qismiga xavfsiz joylash
    response.cookies.set('token', token, {
      httpOnly: true, // JavaScript orqali o'g'irlab bo'lmaydi
      secure: process.env.NODE_ENV === 'production', // Faqat HTTPS da ishlaydi (Vercel da)
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 kun
    });

    return response;

  } catch (error: any) {
    console.error('LOGIN SERVER XATOLIGI:', error);
    return NextResponse.json({ error: 'Serverda xatolik yuz berdi' }, { status: 500 });
  }
}