import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { Invoice } from '@/models/Invoice';
import { Payment } from '@/models/Payment';
import { sendTelegramMessage } from '@/lib/telegram';

export interface PaymentSchedule {
  studentId: string;
  studentName: string;
  phone: string;
  groupName?: string;
  monthlyPrice: number;
  paymentCycle: string;
  nextPaymentDate: Date;
  daysUntilDue: number;
  status: 'paid' | 'upcoming' | 'overdue';
  lastPaymentDate?: Date;
}

export interface PaymentReminder {
  studentId: string;
  studentName: string;
  phone: string;
  nextPaymentDate: Date;
  daysUntilDue: number;
  type: 'today' | 'tomorrow' | 'overdue' | 'upcoming';
}

/**
 * @param anchorDate Registration / billing anchor: for `monthly`, the day-of-month is preserved (e.g. 12th → 12th).
 */
export function calculateNextPaymentDate(
  lastPaymentDate: Date,
  cycle: 'monthly' | 'weekly' | 'quarterly' | 'yearly' | 'custom',
  customDays?: number[],
  anchorDate?: Date | null
): Date {
  const date = new Date(lastPaymentDate);

  switch (cycle) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly': {
      if (anchorDate) {
        const anchorDay = new Date(anchorDate).getDate();
        const d = new Date(lastPaymentDate);
        d.setMonth(d.getMonth() + 1);
        const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(anchorDay, lastDayOfMonth));
        return d;
      }
      date.setMonth(date.getMonth() + 1);
      break;
    }
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'custom':
      if (customDays && customDays.length > 0) {
        const today = new Date();
        const currentDay = today.getDate();

        const nextCustomDay = customDays.find((d) => d >= currentDay);
        if (nextCustomDay) {
          date.setDate(nextCustomDay);
        } else {
          date.setDate(customDays[0]);
          date.setMonth(date.getMonth() + 1);
        }
      }
      break;
  }

  return date;
}

export async function updateStudentPaymentDates(studentId: string): Promise<void> {
  const student = await Student.findById(studentId);
  if (!student) return;

  const anchor = student.paymentStartDate || student.createdAt || new Date();
  if (!student.lastPaymentDate) {
    student.nextPaymentDate = calculateNextPaymentDate(
      new Date(anchor),
      student.paymentCycle as any,
      student.customPaymentDays,
      anchor
    );
  } else {
    student.nextPaymentDate = calculateNextPaymentDate(
      student.lastPaymentDate,
      student.paymentCycle as any,
      student.customPaymentDays,
      anchor
    );
  }

  await student.save();
}

export async function getUpcomingPayments(
  daysAhead: number = 7
): Promise<PaymentSchedule[]> {
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const students = await Student.find({
    status: 'active',
    monthlyPrice: { $gt: 0 },
    nextPaymentDate: { $lte: futureDate },
  })
    .populate('groupId', 'name')
    .lean();

  return students.map((s: any) => {
    const nextDate = new Date(s.nextPaymentDate);
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let status: 'paid' | 'upcoming' | 'overdue' = 'upcoming';
    if (diffDays < 0) status = 'overdue';
    else if (diffDays === 0) status = 'paid';

    return {
      studentId: s._id,
      studentName: s.name,
      phone: s.phone,
      groupName: s.groupId?.name,
      monthlyPrice: s.monthlyPrice,
      paymentCycle: s.paymentCycle,
      nextPaymentDate: s.nextPaymentDate,
      daysUntilDue: diffDays,
      status,
      lastPaymentDate: s.lastPaymentDate,
    };
  });
}

export async function getOverdueStudents(): Promise<PaymentSchedule[]> {
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const students = await Student.find({
    status: 'active',
    monthlyPrice: { $gt: 0 },
    nextPaymentDate: { $lt: today },
  })
    .populate('groupId', 'name')
    .lean();

  return students.map((s: any) => {
    const nextDate = new Date(s.nextPaymentDate);
    const diffTime = today.getTime() - nextDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      studentId: s._id,
      studentName: s.name,
      phone: s.phone,
      groupName: s.groupId?.name,
      monthlyPrice: s.monthlyPrice,
      paymentCycle: s.paymentCycle,
      nextPaymentDate: s.nextPaymentDate,
      daysUntilDue: -diffDays,
      status: 'overdue' as const,
      lastPaymentDate: s.lastPaymentDate,
    };
  });
}

export async function getPaymentReminders(): Promise<{
  today: PaymentReminder[];
  tomorrow: PaymentReminder[];
  overdue: PaymentReminder[];
  upcoming: PaymentReminder[];
}> {
  await connectDB();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekAhead = new Date(today);
  weekAhead.setDate(weekAhead.getDate() + 7);

  const result = {
    today: [] as PaymentReminder[],
    tomorrow: [] as PaymentReminder[],
    overdue: [] as PaymentReminder[],
    upcoming: [] as PaymentReminder[],
  };

  const students = await Student.find({
    status: 'active',
    monthlyPrice: { $gt: 0 },
    nextPaymentDate: { $lte: weekAhead },
  }).lean();

  for (const student of students) {
    const nextDate = new Date(student.nextPaymentDate);
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const reminder: PaymentReminder = {
      studentId: String(student._id),
      studentName: student.name,
      phone: student.phone,
      nextPaymentDate: student.nextPaymentDate,
      daysUntilDue: diffDays,
      type: 'upcoming',
    };

    if (diffDays <= 0) {
      reminder.type = 'overdue';
      result.overdue.push(reminder);
    } else if (diffDays === 0) {
      reminder.type = 'today';
      result.today.push(reminder);
    } else if (diffDays === 1) {
      reminder.type = 'tomorrow';
      result.tomorrow.push(reminder);
    } else {
      result.upcoming.push(reminder);
    }

    if (student.notificationEnabled) {
      if (diffDays <= 0) {
        await sendTelegramMessage(
          `⚠️ <b>Toʻlov muddati oʻtgan</b>\n\n` +
          `Oʻquvchi: ${student.name}\n` +
          `Telefon: ${student.phone}\n` +
          `Toʻlov sanasi: ${student.nextPaymentDate?.toLocaleDateString('uz-UZ')}`
        );
      } else if (diffDays <= 3) {
        await sendTelegramMessage(
          `⏰ <b>Toʻlov eslatmasi (markaz)</b>\n\n` +
          `Oʻquvchi: ${student.name}\n` +
          `Telefon: ${student.phone}\n` +
          `Muddati: ${diffDays} kun qoldi`
        );
      }
    }
  }

  return result;
}

export async function recordPaymentAndUpdateCycle(
  studentId: string,
  amount: number,
  paymentDate: Date = new Date()
): Promise<void> {
  await connectDB();

  const student = await Student.findById(studentId);
  if (!student) return;

  const payment = new Payment({
    studentId,
    amount,
    month: paymentDate.getMonth() + 1,
    year: paymentDate.getFullYear(),
    description: `To'lov (${student.paymentCycle})`,
  });
  await payment.save();

  const anchor = student.paymentStartDate || student.createdAt || new Date();
  student.lastPaymentDate = paymentDate;
  student.nextPaymentDate = calculateNextPaymentDate(
    paymentDate,
    student.paymentCycle as any,
    student.customPaymentDays,
    anchor
  );
  await student.save();
}

export async function updateAllStudentsPaymentDates(): Promise<{
  updated: number;
  errors: string[];
}> {
  await connectDB();

  const result = {
    updated: 0,
    errors: [] as string[],
  };

  const students = await Student.find({
    status: 'active',
    monthlyPrice: { $gt: 0 },
  });

  for (const student of students) {
    try {
      if (!student.nextPaymentDate) {
        student.nextPaymentDate = student.paymentStartDate || new Date();
      }
      
      await student.save();
      result.updated++;
    } catch (error: any) {
      result.errors.push(`${student.name}: ${error.message}`);
    }
  }

  return result;
}

export async function getPaymentStats(): Promise<{
  totalStudents: number;
  activeStudents: number;
  paidThisMonth: number;
  upcomingPayments: number;
  overduePayments: number;
  totalAmountDue: number;
}> {
  await connectDB();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [studentCount, paidCount, upcoming, overdue] = await Promise.all([
    Student.countDocuments({ status: 'active' }),
    Payment.countDocuments({ month: currentMonth, year: currentYear }),
    Student.countDocuments({
      status: 'active',
      nextPaymentDate: { $gte: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
    }),
    Student.countDocuments({
      status: 'active',
      nextPaymentDate: { $lt: now },
    }),
  ]);

  const overdueStudents = await Student.find({
    status: 'active',
    nextPaymentDate: { $lt: now },
  });

  const totalAmountDue = overdueStudents.reduce(
    (sum, s) => sum + (s.monthlyPrice || 0),
    0
  );

  return {
    totalStudents: studentCount,
    activeStudents: studentCount,
    paidThisMonth: paidCount,
    upcomingPayments: upcoming,
    overduePayments: overdue,
    totalAmountDue,
  };
}