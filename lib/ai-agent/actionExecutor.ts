import { Student } from '@/models/Student';
import { Payment } from '@/models/Payment';
import { Attendance } from '@/models/Attendance';
import { SMSLog } from '@/models/SMSLog';
import { sendSMS } from '@/lib/sms';
import connectDB from '@/lib/db';

export async function executeAgentAction(actionString: string, role: string, centerId: string | null) {
  // Pattern: [ACTION:type:json_data]
  const match = actionString.match(/\[ACTION:(\w+):(\{.*\})\]/);
  if (!match) return null;

  const [, type, dataJson] = match;
  let data: any;
  try {
    data = JSON.parse(dataJson);
  } catch (e) {
    return { success: false, message: 'JSON formatida xatolik' };
  }

  // Role guards
  if (role === 'student' || role === 'parent') {
    return { success: false, message: 'Sizda amal bajarish huquqi yo\'q' };
  }

  if (role === 'teacher' && type !== 'mark_attendance') {
    return { success: false, message: 'O\'qituvchi faqat davomat belgilashi mumkin' };
  }

  await connectDB();

  try {
    switch (type) {
      case 'create_student':
        const student = await Student.create({
          ...data,
          centerId: centerId || null,
          status: 'active'
        });
        return { success: true, message: `Talaba yaratildi: ${student.name}`, data: student };

      case 'add_payment':
        const payment = await Payment.create({
          ...data,
          centerId: centerId || null,
          date: new Date()
        });
        return { success: true, message: `To'lov qo'shildi: ${payment.amount.toLocaleString()} so'm`, data: payment };

      case 'mark_attendance':
        const attendance = await Attendance.create({
          ...data,
          centerId: centerId || null,
          date: data.date ? new Date(data.date) : new Date()
        });
        return { success: true, message: 'Davomat saqlandi', data: attendance };

      case 'send_sms':
        const smsResult = await sendSMS(data.phone, data.message, centerId);
        return { 
          success: smsResult.success, 
          message: smsResult.success ? 'SMS yuborildi' : `SMS xatosi: ${smsResult.error}` 
        };

      default:
        return { success: false, message: `Noma'lum harakat turi: ${type}` };
    }
  } catch (error: any) {
    console.error('Action executor error:', error);
    return { success: false, message: `Xatolik: ${error.message}` };
  }
}
