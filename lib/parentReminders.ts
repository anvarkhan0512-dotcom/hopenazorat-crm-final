import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { sendTelegramToChat } from '@/lib/telegram';
import { tashkentCalendarDayKey } from '@/lib/tashkentDay';

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
    const amount = (s.monthlyPrice || 0).toLocaleString('uz-UZ');
    const msg =
      `Assalomu alaykum, hurmatli ota-ona! 🌟\n\n` +
      `"Hope Study" o'quv markazidan eslatma: farzandingiz <b>${s.name}</b> uchun keyingi to'lov muddati yaqinlashmoqda.\n\n` +
      `📅 <b>To'lov sanasi:</b> ${due}\n` +
      `💰 <b>To'lov miqdori:</b> ${amount} so'm\n\n` +
      `Ilm yo'lidagi hamkorligingiz uchun rahmat! 🙏`;

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

/**
 * Qarzdorlarga kunlik Telegram: faqat debtReminderUntil belgilangan va muddati tugamaganlar.
 */
export async function runDebtorTelegramReminders(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  await connectDB();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const students = await Student.find({
    status: 'active',
    notificationEnabled: true,
    parentTelegramChatId: { $exists: true, $nin: ['', null] },
    nextPaymentDate: { $lt: start },
    debtReminderUntil: { $gte: start },
  }).lean();

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const now = new Date();

  for (const s of students) {
    const chatId = s.parentTelegramChatId?.trim();
    if (!chatId) {
      skipped++;
      continue;
    }

    /** Anti-spam: Bir kunda bir marta */
    const todayKey = tashkentCalendarDayKey(now);
    const lastKey = s.lastDebtorTelegramAt ? tashkentCalendarDayKey(new Date(s.lastDebtorTelegramAt)) : '';
    if (lastKey && lastKey === todayKey) {
      skipped++;
      continue;
    }

    const due = s.nextPaymentDate ? new Date(s.nextPaymentDate).toLocaleDateString('uz-UZ') : '-';
    const amount = (s.monthlyPrice || 0).toLocaleString('uz-UZ');
    const msg =
      `Assalomu alaykum, hurmatli ota-ona! 📢\n\n` +
      `"Hope Study" o'quv markazidan eslatma: farzandingiz <b>${s.name}</b> uchun to'lov muddati ${due} kuni yakunlangan edi. Iltimos, ushbu qarzni imkon qadar tezroq yopishingizni so'raymiz.\n\n` +
      `💵 <b>Qarzdorlik miqdori:</b> ${amount} so'm\n\n` +
      `O'zaro ishonch va tartib uchun tashakkur! 😊`;

    try {
      const ok = await sendTelegramToChat(chatId, msg);
      if (ok) {
        await Student.updateOne({ _id: s._id }, { $set: { lastDebtorTelegramAt: new Date() } });
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
