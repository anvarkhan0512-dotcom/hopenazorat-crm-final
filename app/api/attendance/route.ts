import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Attendance } from '@/models/Attendance';
import { Student } from '@/models/Student';
import { sendTelegramMessage, sendTelegramToChat } from '@/lib/telegram';
import { User } from '@/models/User';

function buildAttendanceTelegramText(params: {
  studentName: string;
  status: string;
  lessonNumber: number;
  date: string;
  checkInTime?: string | null;
  rescheduleDate?: string | null;
  transferAt?: string | null;
}): string {
  const lessonLine = `📘 Dars: <b>${params.lessonNumber}</b> | Sana: ${params.date}`;
  if (params.status === 'present') {
    return (
      `✅ <b>Davomat</b>\n\n` +
      `${lessonLine}\n` +
      `Oʻquvchi: <b>${params.studentName}</b>\n` +
      `Holat: darsga kelgan\n` +
      `🕒 Kelgan vaqt: ${params.checkInTime || '—'}`
    );
  }
  if (params.status === 'rescheduled') {
    return (
      `📅 <b>Dars boshqa kunga koʻchirildi</b>\n\n` +
      `${lessonLine}\n` +
      `Oʻquvchi: <b>${params.studentName}</b>\n` +
      `Yangi sana: ${params.rescheduleDate || '—'}`
    );
  }
  if (params.status === 'transferred') {
    return (
      `🔀 <b>Oʻquvchi boshqa ustozga oʻtkazildi</b>\n\n` +
      `${lessonLine}\n` +
      `Oʻquvchi: <b>${params.studentName}</b>\n` +
      `Sana va vaqt: ${params.transferAt || '—'}`
    );
  }
  return (
    `❌ <b>Davomat</b>\n\n` +
    `${lessonLine}\n` +
    `Oʻquvchi: <b>${params.studentName}</b>\n` +
    `Holat: darsga kelmagan`
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
        const {
          studentId,
          date,
          lessonNumber,
          status,
          rescheduleDate,
          checkInTime,
          transferAt,
          redirectTeacherUserId,
        } = item;
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

        const st =
          status === 'transferred'
            ? 'transferred'
            : status === 'rescheduled'
              ? 'rescheduled'
              : status === 'absent'
                ? 'absent'
                : 'present';

        const transferDate =
          status === 'transferred' && transferAt
            ? new Date(transferAt)
            : status === 'transferred'
              ? new Date(String(date) + 'T12:00:00')
              : null;
        const redirectTid =
          status === 'transferred' && redirectTeacherUserId
            ? new mongoose.Types.ObjectId(String(redirectTeacherUserId))
            : null;

        await Attendance.findOneAndUpdate(
          { studentId: sid, date: day, lessonNumber: numLesson },
          {
            $set: {
              status: st,
              groupId: student.groupId || undefined,
              rescheduleDate: status === 'rescheduled' && rescheduleDate ? new Date(rescheduleDate) : null,
              checkInTime: status === 'present' ? checkInTime || null : null,
              transferAt: transferDate,
              redirectTeacherUserId: redirectTid,
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
          transferAt: transferDate ? transferDate.toLocaleString('uz-UZ') : null,
        });
        await sendTelegramMessage(text);

        if (student.parentTelegramChatId && student.notificationEnabled !== false) {
          await sendTelegramToChat(student.parentTelegramChatId, text);
        }

        if (status === 'transferred' && redirectTid) {
          const teacher = await User.findById(redirectTid).select('telegramChatId displayName username').lean();
          const chat = teacher?.telegramChatId?.trim();
          if (chat) {
            await sendTelegramToChat(
              chat,
              `Hurmatli ustoz,\n\n` +
                `Sizga yangi oʻquvchi yoʻnaltirildi.\n\n` +
                `Oʻquvchi: <b>${student.name}</b>\n` +
                `Sana: ${transferDate ? transferDate.toLocaleString('uz-UZ') : String(date)}\n\n` +
                `Iltimos, panel orqali maʼlumotlarni tekshiring.`
            );
          }
        }

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
      transferAt: a.transferAt,
      redirectTeacherUserId: a.redirectTeacherUserId,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: "Ma'lumotlarni olishda xatolik" }, { status: 500 });
  }
}
