import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Payment } from '@/models/Payment';
import { Invoice } from '@/models/Invoice';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { computePeriodEndFromLessons } from '@/lib/lessonPeriod';
import { getCached, invalidateCache, CacheKeys } from '@/lib/cache';
import { sendTelegramMessage } from '@/lib/telegram';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const query: any = {};
    
    if (studentId) query.studentId = studentId;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const payments = await Payment.find(query).populate('studentId').sort({ createdAt: -1 });
    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Error fetching payments' }, { status: 500 });
  }
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    const student = await Student.findById(data.studentId);
    if (!student) {
      return NextResponse.json({ error: 'Talaba topilmadi' }, { status: 400 });
    }

    let month = Number(data.month);
    let year = Number(data.year);
    let periodStart = data.periodStart ? new Date(data.periodStart) : undefined;
    let periodEnd =
      data.periodEnd && String(data.periodEnd).trim() ? new Date(data.periodEnd) : undefined;
    const lessonCount = Math.min(24, Math.max(1, Number(data.lessonCount) || 12));

    if (periodStart && !periodEnd) {
      let weekParity: 'all' | 'odd' | 'even' = 'all';
      let weeklySchedule: { day: number }[] | undefined;
      if (student.groupId) {
        const g = await Group.findById(student.groupId)
          .select('weeklySchedule lessonCalendarWeekParity')
          .lean();
        weeklySchedule = g?.weeklySchedule as { day: number }[] | undefined;
        weekParity =
          g?.lessonCalendarWeekParity === 'odd' || g?.lessonCalendarWeekParity === 'even'
            ? g.lessonCalendarWeekParity
            : 'all';
      }
      periodEnd = computePeriodEndFromLessons(periodStart, lessonCount, weeklySchedule, weekParity);
      
      /** 
       * Keyingi to'lov sanasini (13-dars) avtomatik belgilash.
       * computePeriodEndFromLessons(lessonCount + 1) -> 13-dars sanasi.
       */
      const nextDue = computePeriodEndFromLessons(periodStart, lessonCount + 1, weeklySchedule, weekParity);
      student.nextPaymentDate = nextDue;
      await student.save();
    } else if (periodEnd) {
      /** Agar qo'lda periodEnd kiritilgan bo'lsa, keyingi to'lovni 1 kun keyinga suramiz (taxminiy) */
      const nextDue = new Date(periodEnd);
      nextDue.setDate(nextDue.getDate() + 1);
      student.nextPaymentDate = nextDue;
      await student.save();
    }

    if (periodStart && periodEnd) {
      const pe = periodEnd;
      month = pe.getMonth() + 1;
      year = pe.getFullYear();
    }
    if (!(month >= 1 && month <= 12 && year >= 2000)) {
      const now = new Date();
      month = now.getMonth() + 1;
      year = now.getFullYear();
    }

    let expectedDueDate: Date | undefined = data.expectedDueDate
      ? new Date(data.expectedDueDate)
      : student.nextPaymentDate
        ? new Date(student.nextPaymentDate)
        : undefined;

    const paidAt = new Date();
    let daysVariance: number | undefined;
    if (expectedDueDate) {
      const a = startOfDay(paidAt);
      const b = startOfDay(expectedDueDate);
      daysVariance = Math.round((a.getTime() - b.getTime()) / 86400000);
    }

    const payment = new Payment({
      studentId: data.studentId,
      amount: data.amount,
      month,
      year,
      periodStart,
      periodEnd,
      lessonCount,
      expectedDueDate,
      daysVariance,
      description: data.description || '',
    });

    await payment.save();
    await payment.populate('studentId');

    const invoice = await Invoice.findOne({
      studentId: data.studentId,
      month,
      year,
    });

    if (invoice) {
      invoice.paidAmount += data.amount;
      if (invoice.paidAmount >= invoice.amount) {
        invoice.status = 'paid';
        invoice.paidAmount = invoice.amount;
      } else if (invoice.paidAmount > 0) {
        invoice.status = 'partial';
      }
      await invoice.save();
    }

    invalidateCache(CacheKeys.DASHBOARD);
    invalidateCache('invoices:');
    invalidateCache('debtors:');

    sendTelegramMessage(
      `💰 <b>Toʻlov qabul qilindi</b>\n\n` +
        `Oʻquvchi: <b>${student.name}</b>\n` +
        `Summa: ${data.amount.toLocaleString('uz-UZ')} soʻm\n` +
        `Davr: ${month}/${year}${
          periodStart && periodEnd
            ? ` (${periodStart.toLocaleDateString('uz-UZ')} — ${periodEnd.toLocaleDateString('uz-UZ')})`
            : ''
        }`
    );
    
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Error creating payment' }, { status: 500 });
  }
}