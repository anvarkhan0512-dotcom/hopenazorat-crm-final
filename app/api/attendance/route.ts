import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Attendance } from '@/models/Attendance';
import { Student } from '@/models/Student';
import { sendTelegramMessage } from '@/lib/telegram';

function buildAttendanceTelegramText(params: {
  studentName: string;
  status: string;
  lessonNumber: number;
  date: string;
  checkInTime?: string | null;
  rescheduleDate?: string | null;
}): string {
  const lessonLine = `📘 Dars: <b>${params.lessonNumber}</b> | Sana: ${params.date}`;
  if (params.status === 'present') {
    return (
      `✅ <b>Davomat</b>\n\n` +
      `${lessonLine}\n` +
      `O'quvchi: <b>${params.studentName}</b>\n` +
      `Status: Keldi\n🕒 Vaqt: ${params.checkInTime || '--:--'}`
    );
  }
  if (params.status === 'rescheduled') {
    return (
      `📅 <b>Dars ko'chirildi</b>\n\n` +
      `${lessonLine}\n` +
      `O'quvchi: <b>${params.studentName}</b>\n` +
      `Yangi sana: ${params.rescheduleDate || '-'}`
    );
  }
  return (
    `❌ <b>Davomat</b>\n\n` +
    `${lessonLine}\n` +
    `O'quvchi: <b>${params.studentName}</b>\n` +
    `Status: Kelmadi`
  );
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Array kutilmoqda' }, { status: 400 });
    }

    const results = { success: 0, errors: [] as string[] };

    for (const item of body) {
      try {
        const { studentId, date, lessonNumber, status, rescheduleDate, checkInTime } = item;
        if (!status) {
          results.errors.push(`ID ${studentId}: status tanlanmagan`);
          continue;
        }
        const numLesson = Math.min(12, Math.max(1, Number(lessonNumber) || 1));
        const sid = new mongoose.Types.ObjectId(String(studentId));
        const student = await Student.findById(sid);
        if (!student) {
          results.errors.push(`ID ${studentId}: talaba topilmadi`);
          continue;
        }

        const day = new Date(date);
        day.setHours(12, 0, 0, 0);

        await Attendance.findOneAndUpdate(
          { studentId: sid, date: day, lessonNumber: numLesson },
          {
            $set: {
              status: status === 'rescheduled' ? 'rescheduled' : status === 'absent' ? 'absent' : 'present',
              groupId: student.groupId || undefined,
              rescheduleDate: status === 'rescheduled' && rescheduleDate ? new Date(rescheduleDate) : null,
              checkInTime: status === 'present' ? checkInTime || null : null,
            },
          },
          { upsert: true, new: true }
        );

        const text = buildAttendanceTelegramText({
          studentName: student.name,
          status: String(status),
          lessonNumber: numLesson,
          date: String(date),
          checkInTime,
          rescheduleDate: rescheduleDate ? String(rescheduleDate) : null,
        });
        await sendTelegramMessage(text);

        results.success++;
      } catch (e: any) {
        results.errors.push(`ID ${item.studentId}: ${e.message}`);
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ error: 'Serverda xatolik yuz berdi' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query: Record<string, unknown> = {};

    if (searchParams.get('studentId')) query.studentId = searchParams.get('studentId');
    if (searchParams.get('groupId')) query.groupId = searchParams.get('groupId');
    if (searchParams.get('date')) {
      const d = new Date(searchParams.get('date')!);
      d.setHours(12, 0, 0, 0);
      query.date = d;
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'name phone')
      .populate('groupId', 'name')
      .sort({ date: -1, lessonNumber: -1 })
      .lean();

    const result = attendance.map((a: any) => ({
      _id: a._id,
      studentId: a.studentId?._id || a.studentId,
      studentName: a.studentId?.name,
      phone: a.studentId?.phone,
      groupId: a.groupId?._id || a.groupId,
      groupName: a.groupId?.name,
      date: a.date?.toISOString()?.split('T')[0],
      lessonNumber: a.lessonNumber,
      status: a.status,
      checkInTime: a.checkInTime,
      rescheduleDate: a.rescheduleDate,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: "Ma'lumotlarni olishda xatolik" }, { status: 500 });
  }
}
