import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

// Agar .env faylda JWT_SECRET bo'lmasa, vaqtincha shu kalit ishlatiladi
const JWT_SECRET = process.env.JWT_SECRET || 'edu-crm-secret-key-2024';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // 1. Frontenddan kelayotgan ma'lumotni o'qish
    const body = await request.json();
    const { username, password } = body;

    // 2. Foydalanuvchini bazadan qidirish (Trim - bo'sh joylarni olib tashlaydi)
    const user = await User.findOne({ username: String(username ?? '').trim() });
    
    if (!user) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 401 });
    }

    // 3. Parolni tekshirish
    const isValidPassword = await bcrypt.compare(String(password ?? ''), user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Parol noto‘g‘ri' }, { status: 401 });
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
      },
    });

    // Tokenni brauzer cookie qismiga xavfsiz joylash
    response.cookies.set('token', token, {
      httpOnly: true, // JavaScript orqali o'g'irlab bo'lmaydi
      secure: process.env.NODE_ENV === 'production', // Faqat HTTPS da ishlaydi (Vercel da)
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 kun
    });

    return response;

  } catch (error: any) {
    console.error('LOGIN SERVER XATOLIGI:', error);
    return NextResponse.json({ error: 'Serverda xatolik yuz berdi' }, { status: 500 });
  }
}