import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

/** Yangi ustoz / ota-ona akkaunti (admin). */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { username, password, role, displayName } = await request.json();
    if (!username || !password || !['teacher', 'parent'].includes(role)) {
      return NextResponse.json({ error: 'username, password, role (teacher|parent)' }, { status: 400 });
    }

    await connectDB();
    const exists = await User.findOne({ username });
    if (exists) return NextResponse.json({ error: 'Username band' }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashed,
      role,
      displayName: displayName || '',
      linkedStudentIds: [],
      revealablePassword: String(password),
    });

    return NextResponse.json({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
