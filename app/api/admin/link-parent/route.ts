import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';
import { User } from '@/models/User';
import { Student } from '@/models/Student';

/** Admin links an existing parent account to a student (ota-ona ID / akkaunt bog‘lash). */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { studentId, parentUserId } = await request.json();
    if (!studentId || !parentUserId) {
      return NextResponse.json({ error: 'studentId va parentUserId kerak' }, { status: 400 });
    }

    await connectDB();
    const parent = await User.findById(parentUserId);
    if (!parent || parent.role !== 'parent') {
      return NextResponse.json({ error: 'Faqat ota-ona roli (parent) bo‘lgan foydalanuvchi' }, { status: 400 });
    }

    const student = await Student.findById(studentId);
    if (!student) return NextResponse.json({ error: 'Talaba topilmadi' }, { status: 404 });

    if (student.parentUserId && student.parentUserId.toString() !== parentUserId) {
      return NextResponse.json({ error: 'Talaba boshqa ota-onaga bog‘langan' }, { status: 409 });
    }

    student.parentUserId = parent._id as any;
    await student.save();

    await User.updateOne(
      { _id: parent._id },
      { $addToSet: { linkedStudentIds: student._id } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
