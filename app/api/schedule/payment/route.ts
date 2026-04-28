import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { Payment } from '@/models/Payment';
import { calculateNextPaymentDate } from '@/lib/payments';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();
    
    const { studentId, amount, month, year, notify } = data;

    if (!studentId || !amount) {
      return NextResponse.json(
        { error: 'studentId and amount required' },
        { status: 400 }
      );
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const paymentMonth = month || new Date().getMonth() + 1;
    const paymentYear = year || new Date().getFullYear();
    const paymentDate = new Date();

    const payment = new Payment({
      studentId,
      amount,
      month: paymentMonth,
      year: paymentYear,
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

    if (notify || student.notificationEnabled) {
      await sendTelegramMessage(
        `✅ <b>To'lov qabul qilindi</b>\n\n` +
        `Talaba: ${student.name}\n` +
        `Summa: ${amount.toLocaleString()} so'm\n` +
        `Keyingi to'lov: ${student.nextPaymentDate?.toLocaleDateString()}`
      );
    }

    return NextResponse.json({
      success: true,
      payment: {
        amount,
        month: paymentMonth,
        year: paymentYear,
        nextPaymentDate: student.nextPaymentDate,
      },
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json({ error: 'Error recording payment' }, { status: 500 });
  }
}