import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireParentOnly } from '@/lib/auth-server';
import { Homework } from '@/models/Homework';
import { HomeworkSubmission } from '@/models/HomeworkSubmission';
import { Student } from '@/models/Student';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireParentOnly(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();
    const ids = auth!.linkedStudentIds;
    if (!ids.length) return NextResponse.json({ items: [] });

    const studentsData = await Promise.all(
      ids.map(async (sid) => {
        const st = await Student.findById(sid).select('groupId name').lean();
        if (!st?.groupId) return { studentId: sid.toString(), name: '', homework: [] };

        const list = await Homework.find({ groupId: st.groupId }).sort({ createdAt: -1 }).limit(50).lean();

        const out = [];
        for (const h of list) {
          let sub = await HomeworkSubmission.findOne({
            homeworkId: h._id,
            studentId: sid,
          }).lean();
          if (!sub) {
            await HomeworkSubmission.updateOne(
              { homeworkId: h._id, studentId: sid },
              { $setOnInsert: { status: 'not_submitted' } },
              { upsert: true }
            );
            sub = await HomeworkSubmission.findOne({
              homeworkId: h._id,
              studentId: sid,
            }).lean();
          }
          out.push({
            homework: h,
            status: sub?.status || 'not_submitted',
            submissionImageUrl: sub?.submissionImageUrl || '',
          });
        }

        return {
          studentId: sid.toString(),
          name: st.name,
          homework: out,
        };
      })
    );

    return NextResponse.json({ items: studentsData });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
