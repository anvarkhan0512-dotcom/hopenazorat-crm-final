export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Attendance } from '@/models/Attendance';
import { Student } from '@/models/Student';
import { sendTelegramMessage, sendTelegramToChat } from '@/lib/telegram';
import { User } from '@/models/User';
import { getAuthUser, requireAuthUser, requireTeacher } from '@/lib/auth-server';

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

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAuthUser(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    await connectDB();

    const { searchParams } = new URL(request.url);
    const query: Record<string, any> = {};

    // Data isolation
    if (auth?.centerId) {
      query.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      query.$or = [
        { centerId: { $exists: false } },
        { centerId: null }
      ];
    }

    const { studentId, date, groupId, month, year } = Object.fromEntries(searchParams.entries());

    if (studentId) query.studentId = studentId;
    if (date) {
      const d = new Date(date);
      d.setHours(12, 0, 0, 0);
      query.date = d;
    }
    if (groupId) query.groupId = groupId;
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.date = { $gte: start, $lte: end };
    }

    const list = await Attendance.find(query).sort({ date: -1, lessonNumber: 1 }).lean();
    return NextResponse.json({ items: list });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ error: 'Server error', items: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireTeacher(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

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
        if (!student || (auth!.role !== 'boss' && student.centerId?.toString() !== auth!.centerId)) {
          results.errors.push(`ID ${studentId}: talaba topilmadi yoki ruxsat yo'q`);
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
              centerId: auth!.centerId ? new mongoose.Types.ObjectId(auth!.centerId) : null,
              rescheduleDate: status === 'rescheduled' && rescheduleDate ? new Date(rescheduleDate) : null,
              checkInTime: status === 'present' ? checkInTime || null : null,
              checkOutTime: item.checkOutTime || null,
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
