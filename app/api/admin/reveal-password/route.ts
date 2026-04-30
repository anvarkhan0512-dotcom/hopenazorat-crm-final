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

    const { adminPassword, userId } = await request.json();
    if (!adminPassword || !userId) {
      return NextResponse.json({ error: 'adminPassword va userId kerak' }, { status: 400 });
    }

    await connectDB();
    const admin = await User.findById(auth!.id);
    const target = await User.findById(userId).select('revealablePassword');
    if (!admin || !target) {
      return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });
    }

    const raw = String(adminPassword);
    let ok = await bcrypt.compare(raw, admin.password);
    if (!ok && admin.password === raw) ok = true;
    if (!ok) {
      return NextResponse.json({ error: 'Admin paroli noto‘g‘ri' }, { status: 403 });
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
