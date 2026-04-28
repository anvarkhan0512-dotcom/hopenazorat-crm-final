import { NextRequest, NextResponse } from 'next/server';
import type { Types } from 'mongoose';
import connectDB from '@/lib/db';
import { getAuthUser, requireStudent } from '@/lib/auth-server';
import { Student } from '@/models/Student';
import { Homework } from '@/models/Homework';
import { HomeworkSubmission } from '@/models/HomeworkSubmission';
import { Attendance } from '@/models/Attendance';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireStudent(auth);
    if (denied) {
      return NextResponse.json({ error: denied.error }, { status: denied.status });
    }

    await connectDB();
    const studentId = auth!.linkedStudentIds[0];

    const st = await Student.findById(studentId)
      .select('name groupId scoreRecords')
      .populate('groupId', 'name')
      .lean();

    if (!st) {
      return NextResponse.json({ error: 'Talaba topilmadi' }, { status: 404 });
    }

    const attendance = await Attendance.find({ studentId })
      .sort({ date: -1 })
      .limit(60)
      .select('date status lessonNumber')
      .lean();

    const rawGroup = st.groupId as unknown;
    let groupIdForHomework: Types.ObjectId | null = null;
    if (rawGroup && typeof rawGroup === 'object' && '_id' in (rawGroup as object)) {
      groupIdForHomework = (rawGroup as { _id: Types.ObjectId })._id;
    } else if (rawGroup) {
      groupIdForHomework = rawGroup as Types.ObjectId;
    }

    let homework: unknown[] = [];
    if (groupIdForHomework) {
      const list = await Homework.find({ groupId: groupIdForHomework }).sort({ createdAt: -1 }).limit(40).lean();
      const subs = await HomeworkSubmission.find({ studentId, homeworkId: { $in: list.map((h) => h._id) } })
        .select('homeworkId status submissionImageUrl')
        .lean();
      const subMap = new Map(subs.map((s) => [s.homeworkId.toString(), s]));
      homework = list.map((h) => {
        const s = subMap.get(h._id.toString());
        return {
          homework: h,
          status: s?.status || 'not_submitted',
          submissionImageUrl: s?.submissionImageUrl || '',
        };
      });
    }

    return NextResponse.json({
      student: {
        name: st.name,
        group: st.groupId,
        scoreRecords: st.scoreRecords ?? [],
      },
      attendance,
      homework,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
