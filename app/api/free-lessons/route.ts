import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { FreeLesson } from '@/models/FreeLesson';
import { User } from '@/models/User';
import { getAuthUser, isAdminRole, requireTeacher } from '@/lib/auth-server';
import { sendTelegramToChat } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireTeacher(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();
    const list = await FreeLesson.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('studentId', 'name phone')
      .populate('notifyTeacherUserId', 'username displayName telegramChatId')
      .lean();
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, notes, outcome, reason, notifyTeacherUserId } = body;
    if (!studentId) {
      return NextResponse.json({ error: 'studentId kerak' }, { status: 400 });
    }

    await connectDB();
    const doc = await FreeLesson.create({
      studentId: new mongoose.Types.ObjectId(String(studentId)),
      notes: String(notes || ''),
      outcome: outcome === 'left' || outcome === 'stayed' ? outcome : '',
      reason: String(reason || ''),
      notifyTeacherUserId: notifyTeacherUserId
        ? new mongoose.Types.ObjectId(String(notifyTeacherUserId))
        : undefined,
    });

    if (reason && notifyTeacherUserId) {
      const t = await User.findById(notifyTeacherUserId).select('telegramChatId').lean();
      const chat = t?.telegramChatId?.trim();
      if (chat) {
        await sendTelegramToChat(
          chat,
          `Hurmatli ustoz,\n\n` +
            `📝 <b>Bepul dars haqida xabar</b>\n` +
            `Sabab: ${reason}\n` +
            `Natija: ${outcome === 'left' ? 'ketgan' : outcome === 'stayed' ? 'qolgan' : outcome || '—'}\n\n` +
            `Iltimos, kerak boʻlsa, oʻquvchi bilan bogʻlaning.`
        );
      }
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server' }, { status: 500 });
  }
}
