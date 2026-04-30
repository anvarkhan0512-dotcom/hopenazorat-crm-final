import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireTeacherOnly } from '@/lib/auth-server';
import { Group } from '@/models/Group';
import { Student } from '@/models/Student';
import { getTeacherPaymentStats } from '@/lib/teacherFinance';
import { serializeGroupForClient } from '@/lib/serializeGroup';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const forbidden = requireTeacherOnly(auth);
    if (forbidden) {
      return NextResponse.json({ error: forbidden.error }, { status: forbidden.status });
    }

    await connectDB();

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const groups = await Group.find({
      isActive: true,
      $or: [{ teacherUserId: auth!._id }, { teacherUserId2: auth!._id }],
    })
      .sort({ name: 1 })
      .lean();

    const groupIds = groups.map((g) => g._id);
    const students = await Student.find({ groupId: { $in: groupIds }, status: 'active' })
      .populate('groupId', 'name')
      .sort({ name: 1 })
      .lean();

    const finance = await getTeacherPaymentStats(auth!._id, month, year);

    return NextResponse.json({
      month,
      year,
      groups: groups.map((g) => serializeGroupForClient(g as Record<string, unknown>, 'teacher')),
      students,
      finance,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
