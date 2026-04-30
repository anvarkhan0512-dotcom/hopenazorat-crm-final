import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'edu-crm-secret-key-2024';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    await connectDB();
    const u = await User.findById(decoded.id).select('-password').lean();
    if (!u) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: u._id.toString(),
        username: u.username,
        role: u.role,
        displayName: u.displayName || '',
        avatarUrl: u.avatarUrl || '',
        telegramChatId: u.telegramChatId || '',
        linkedStudentIds: (u.linkedStudentIds || []).map((id) => id.toString()),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    await connectDB();
    const u = await User.findById(decoded.id);
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const body = await request.json();
    const { currentPassword, newPassword, displayName, telegramChatId } = body;

    if (newPassword) {
      const cur = String(currentPassword ?? '');
      let ok = await bcrypt.compare(cur, u.password);
      if (!ok && u.password === cur) ok = true;
      if (!ok) return NextResponse.json({ error: 'Joriy parol noto‘g‘ri' }, { status: 400 });
      u.password = await bcrypt.hash(String(newPassword), 10);
      u.revealablePassword = '';
    }

    if (displayName !== undefined) u.displayName = String(displayName);
    if (telegramChatId !== undefined && u.role === 'teacher') {
      u.telegramChatId = String(telegramChatId).trim();
    }

    await u.save();

    return NextResponse.json({
      user: {
        id: u._id.toString(),
        username: u.username,
        role: u.role,
        displayName: u.displayName || '',
        avatarUrl: u.avatarUrl || '',
        telegramChatId: u.telegramChatId || '',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
