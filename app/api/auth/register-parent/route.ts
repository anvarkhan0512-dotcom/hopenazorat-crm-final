import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { Student } from '@/models/Student';

export async function POST(request: NextRequest) {
  try {
    const { username, password, parentAccessCode } = await request.json();

    if (!username || !password || !parentAccessCode) {
      return NextResponse.json({ error: 'username, password, parentAccessCode required' }, { status: 400 });
    }

    await connectDB();

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ error: 'Username band' }, { status: 400 });
    }

    const code = String(parentAccessCode).trim().toUpperCase();
    const student = await Student.findOne({ parentAccessCode: code });
    if (!student) {
      return NextResponse.json({ error: 'Noto‘g‘ri ota-ona ID (kod)' }, { status: 404 });
    }

    if (student.parentUserId) {
      return NextResponse.json({ error: 'Bu talaba allaqachon boshqa akkauntga bog‘langan' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashed,
      role: 'parent',
      linkedStudentIds: [student._id],
      displayName: student.parentName || '',
    });

    student.parentUserId = user._id as any;
    await student.save();

    return NextResponse.json({
      success: true,
      message: "Akkaunt yaratildi va farzand bog‘landi",
      userId: user._id.toString(),
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Server xatolik' }, { status: 500 });
  }
}
