import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireTeacher } from '@/lib/auth-server';
import { Homework } from '@/models/Homework';
import { HomeworkSubmission } from '@/models/HomeworkSubmission';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const hw = await Homework.findById(params.id).lean();
    if (!hw) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });

    const group = await Group.findById(hw.groupId).lean();

    const subs = await HomeworkSubmission.find({ homeworkId: hw._id })
      .populate('studentId', 'name phone')
      .lean();

    return NextResponse.json({ homework: hw, submissions: subs, group });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireTeacher(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();
    const hw = await Homework.findById(params.id);
    if (!hw) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });

    const group = await Group.findById(hw.groupId);
    if (auth!.role === 'teacher' && group) {
      const ok =
        group.teacherUserId?.toString() === auth!.id ||
        group.teacherUserId2?.toString() === auth!.id;
      if (!ok) {
        return NextResponse.json({ error: 'Faqat o‘z guruhidagi vazifani o‘chirishingiz mumkin' }, { status: 403 });
      }
    }

    await HomeworkSubmission.deleteMany({ homeworkId: hw._id });
    await hw.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
