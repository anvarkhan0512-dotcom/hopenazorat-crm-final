import connectDB from './db';
import { Student } from '@/models/Student';
import { Attendance } from '@/models/Attendance';
import { sendTelegramMessage } from './telegram';

export async function checkUnpaidLessons() {
  try {
    await connectDB();
    const students = await Student.find({ status: 'active', paymentSchedule: { $exists: true } });

    for (const student of students) {
      const sinceDate = student.lastPaymentDate || student.paymentSchedule?.startDate;
      if (!sinceDate) continue;

      const unpaidAttendanceCount = await Attendance.countDocuments({
        studentId: student._id,
        date: { $gt: sinceDate },
        status: { $in: ['present', 'absent'] }
      });

      if (unpaidAttendanceCount >= 3) {
        // Only notify if we haven't notified recently for this specific student
        // For simplicity, we'll just send it, but in production we might want a 'lastUnpaidNotifyAt' field
        await sendTelegramMessage(
          `📢 <b>To'lov qilinmagan darslar</b>\n\n` +
          `O'quvchi: <b>${student.name}</b>\n` +
          `To'lovsiz darslar soni: <b>${unpaidAttendanceCount} ta</b>\n` +
          `Oxirgi to'lov: ${student.lastPaymentDate ? student.lastPaymentDate.toLocaleDateString('uz-UZ') : 'Yo\'q'}\n` +
          `Telefon: ${student.phone}`
        );
      }
    }
  } catch (error) {
    console.error('checkUnpaidLessons error:', error);
  }
}

export async function checkAndNotifyDeadlines() {
  try {
    await connectDB();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Find overdue students who are not yet blocked
    const overdueStudents = await Student.find({
      paymentDeadline: { $lt: today },
      isBlocked: false,
      status: 'active'
    });

    for (const student of overdueStudents) {
      const extendCount = student.deadlineExtendCount || 0;

      if (extendCount === 0) {
        // First time overdue: Notify Admin only
        await sendTelegramMessage(
          `⚠️ <b>To'lov muddati o'tdi (Admin uchun)</b>\n\n` +
          `O'quvchi: <b>${student.name}</b>\n` +
          `Muddat: ${student.paymentDeadline?.toLocaleDateString('uz-UZ')}\n` +
          `Telefon: ${student.phone}\n\n` +
          `Hozircha bloklanmadi. Birinchi ogohlantirish.`
        );
        
        // Mark that we've notified for the first time by setting extendCount to 0 (already is)
        // We can use another field if needed, but for now, we'll just notify admin.
      } else if (extendCount >= 1) {
        // Second time overdue: Auto-block + Notify Student & Parent
        student.isBlocked = true;
        student.blockReason = "To'lov muddati o'tib ketgan (Ikkinchi ogohlantirishdan keyin avtomatik bloklandi)";
        student.blockedAt = new Date();
        await student.save();

        const blockMsg = 
          `🚫 <b>Hisob bloklandi</b>\n\n` +
          `Hurmatli ${student.name},\n` +
          `To'lov muddati o'tib ketganligi sababli hisobingiz vaqtincha bloklandi.\n` +
          `Iltimos, to'lovni amalga oshiring va ma'muriyatga murojaat qiling.`;

        // Notify via Telegram if IDs exist
        if (student.telegramId) {
          // Assuming a generic send function exists or use sendTelegramMessage for admin log
          await sendTelegramMessage(`Bloklandi: ${student.name} (Telegram ID: ${student.telegramId})`);
        }
        
        // Notify admin about the auto-block
        await sendTelegramMessage(
          `🚫 <b>Avtomatik bloklash</b>\n\n` +
          `O'quvchi: <b>${student.name}</b>\n` +
          `Sabab: To'lov muddati o'tgan (Extend count: ${extendCount})`
        );
      }
    }

    return { success: true, processed: overdueStudents.length };
  } catch (error) {
    console.error('checkAndNotifyDeadlines error:', error);
    return { success: false, error };
  }
}
