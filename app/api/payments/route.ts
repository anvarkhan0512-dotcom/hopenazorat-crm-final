import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Payment } from '@/models/Payment';
import { Invoice } from '@/models/Invoice';
import { Student } from '@/models/Student';
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

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();
    
    const payment = new Payment({
      studentId: data.studentId,
      amount: data.amount,
      month: data.month,
      year: data.year,
      description: data.description || '',
    });

    await payment.save();
    await payment.populate('studentId');

    const invoice = await Invoice.findOne({
      studentId: data.studentId,
      month: data.month,
      year: data.year,
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

    const student = await Student.findById(data.studentId);
    if (student) {
      sendTelegramMessage(
        `💰 <b>To'lov qabul qilindi</b>\n\n` +
        `Talaba: ${student.name}\n` +
        `Summa: ${data.amount.toLocaleString()} so'm\n` +
        `Oy: ${data.month}/${data.year}`
      );
    }
    
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Error creating payment' }, { status: 500 });
  }
}