import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { Student } from '@/models/Student';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

    // 4. JWT Token yaratish
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 7 kunlik muddat
    );

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