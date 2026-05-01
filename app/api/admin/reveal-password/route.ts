import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId kerak' }, { status: 400 });
    }

    await connectDB();
    const target = await User.findById(userId).select('revealablePassword');
    if (!target) {
      return NextResponse.json({ error: 'Foydalanuvchi topilmadi' }, { status: 404 });
    }

    const revealed = target.revealablePassword?.trim() || '';
    if (!revealed) {
      return NextResponse.json({
        password: null,
        message: 'Saqlangan ochiq parol yo‘q (parol o‘zgartirilgan yoki eski akkaunt).',
      });
    }

    return NextResponse.json({ password: revealed });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server' }, { status: 500 });
  }
}
