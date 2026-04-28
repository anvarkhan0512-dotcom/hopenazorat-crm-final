import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { sendTelegramToChat } from '@/lib/telegram';

const REMINDER_COOLDOWN_MS = 36 * 60 * 60 * 1000; // don't spam more than once per 36h per student

/**
 * Notify parents on Telegram when payment due date is within `daysAhead` days.
 */
export async function runParentPaymentReminders(daysAhead: number = 3): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  await connectDB();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + daysAhead);
  horizon.setHours(23, 59, 59, 999);

  const students = await Student.find({
    status: 'active',
    notificationEnabled: true,
    parentTelegramChatId: { $exists: true, $nin: ['', null] },
    nextPaymentDate: { $gte: now, $lte: horizon },
  }).lean();

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const s of students) {
    const chatId = s.parentTelegramChatId?.trim();
    if (!chatId) {
      skipped++;
      continue;
    }
    const last = s.lastParentPaymentReminderAt
      ? new Date(s.lastParentPaymentReminderAt).getTime()
      : 0;
    if (Date.now() - last < REMINDER_COOLDOWN_MS) {
      skipped++;
      continue;
    }

    const due = s.nextPaymentDate ? new Date(s.nextPaymentDate).toLocaleDateString('uz-UZ') : '-';
    const msg =
      `⏰ <b>To'lov eslatmasi</b>\n\n` +
      `Farzand: <b>${s.name}</b>\n` +
      `Yaqinlashayotgan to'lov sanasi: ${due}\n` +
      `Summa (oylik): ${(s.monthlyPrice || 0).toLocaleString()} so'm`;

    try {
      const ok = await sendTelegramToChat(chatId, msg);
      if (ok) {
        await Student.updateOne({ _id: s._id }, { $set: { lastParentPaymentReminderAt: new Date() } });
        sent++;
      } else {
        errors.push(`${s.name}: Telegram yuborilmadi`);
      }
    } catch (e: any) {
      errors.push(`${s.name}: ${e.message}`);
    }
  }

  return { sent, skipped, errors };
}
