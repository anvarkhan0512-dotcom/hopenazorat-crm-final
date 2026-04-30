import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';
import { User } from '@/models/User';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { id } = params;
    const { username, password, displayName } = await request.json();

    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (username && username !== user.username) {
      const exists = await User.findOne({ username });
      if (exists) return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
      user.username = username;
    }

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      user.password = hashed;
      user.revealablePassword = password; // Admin uchun saqlab qo'yamiz
    }

    if (displayName !== undefined) {
      user.displayName = displayName;
    }

    await user.save();

    return NextResponse.json({
      id: user._id.toString(),
      username: user.username,
      role: user.role,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { id } = params;
    if (id === auth?.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    await connectDB();
    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
