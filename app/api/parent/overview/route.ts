import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireParentOnly } from '@/lib/auth-server';
import { Student, computeStudentFinalPrice } from '@/models/Student';
import { Attendance } from '@/models/Attendance';
import { Homework } from '@/models/Homework';
import { HomeworkSubmission } from '@/models/HomeworkSubmission';
import { tashkentCalendarDayKey } from '@/lib/tashkentDay';

export const dynamic = 'force-dynamic';

const UZ_DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];

function parityLabel(p: string | undefined): string {
  if (p === 'odd') return 'Faqat toq haftalar (takvim)';
  if (p === 'even') return 'Faqat juft haftalar (takvim)';
  return 'Barcha haftalar';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const forbidden = requireParentOnly(auth);
    if (forbidden) {
      return NextResponse.json({ error: forbidden.error }, { status: forbidden.status });
    }

    await connectDB();
    const ids = auth!.linkedStudentIds;
    if (ids.length === 0) {
      return NextResponse.json({ children: [] });
    }

    const students = await Student.find({ _id: { $in: ids } })
      .populate('groupId', 'name schedule weeklySchedule lessonCalendarWeekParity')
      .lean();

    const children = [];

    for (const st of students) {
      const sid = st._id;
      const effective = computeStudentFinalPrice(st as any);

      const recentAttendance = await Attendance.find({ studentId: sid })
        .sort({ date: -1, lessonNumber: -1 })
        .limit(40)
        .lean();

      const rescheduled = recentAttendance
        .filter((a) => a.status === 'rescheduled')
        .map((a) => ({
          date: a.date,
          lessonNumber: a.lessonNumber,
          rescheduleDate: a.rescheduleDate,
        }));

      const groupId = st.groupId as any;
      const todayKey = tashkentCalendarDayKey(new Date());
      const nextKey = st.nextPaymentDate ? tashkentCalendarDayKey(new Date(st.nextPaymentDate)) : '';
      const isOverdue = !!nextKey && nextKey < todayKey;

      const scheduleLines: string[] = [];
      if (Array.isArray(groupId?.weeklySchedule) && groupId.weeklySchedule.length) {
        for (const slot of groupId.weeklySchedule) {
          const dn = UZ_DAYS[slot.day] ?? String(slot.day);
          scheduleLines.push(`${dn} ${slot.time || ''}`.trim());
        }
      }

      let pendingHomework = 0;
      if (groupId?._id) {
        const hws = await Homework.find({ groupId: groupId._id }).select('_id').lean();
        const hwIds = hws.map((h) => h._id);
        const submitted = await HomeworkSubmission.countDocuments({
          studentId: sid,
          homeworkId: { $in: hwIds },
          status: 'submitted',
        });
        pendingHomework = hwIds.length - submitted;
      }

      children.push({
        studentId: sid.toString(),
        name: st.name,
        phone: st.phone,
        group: groupId?.name || '',
        groupScheduleText: groupId?.schedule || '',
        groupScheduleLines: scheduleLines,
        lessonCalendarWeekParityLabel: parityLabel(groupId?.lessonCalendarWeekParity),
        monthlyPrice: effective,
        nextPaymentDate: st.nextPaymentDate,
        debt: {
          isOverdue,
          hintAmount: isOverdue ? effective : 0,
        },
        attendance: recentAttendance.slice(0, 15).map((a) => ({
          date: a.date,
          lessonNumber: a.lessonNumber,
          status: a.status,
          checkInTime: a.checkInTime,
        })),
        rescheduledHistory: rescheduled,
        pendingHomeworkApprox: Math.max(0, pendingHomework),
      });
    }

    return NextResponse.json({ children });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
