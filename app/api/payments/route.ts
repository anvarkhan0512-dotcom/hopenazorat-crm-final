export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Payment } from '@/models/Payment';
import { Student } from '@/models/Student';
import { Invoice } from '@/models/Invoice';
import { getAuthUser, requireAuthUser, isAdminRole } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/cache';
import { notifyPaymentAdded } from '@/lib/telegram';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAuthUser(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    await connectDB();
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const query: any = {};
    
    // Data isolation
    if (auth?.centerId) {
      query.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      query.$or = [
        { centerId: { $exists: false } },
        { centerId: null }
      ];
    }

    if (studentId) query.studentId = studentId;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const payments = await Payment.find(query).populate('studentId').sort({ createdAt: -1 });
    return NextResponse.json({ items: payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Error fetching payments', items: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await request.json();
    const { studentId, amount, method, comment, month, year, invoiceId } = body;

    if (!studentId || !amount) {
      return NextResponse.json({ error: 'Missing studentId or amount' }, { status: 400 });
    }

    const centerQuery: any = {};
    if (auth?.centerId) {
      centerQuery.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      centerQuery.$or = [{ centerId: { $exists: false } }, { centerId: null }];
    }

    const student = await Student.findOne({ _id: studentId, ...centerQuery });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const payment = await Payment.create({
      studentId,
      amount,
      method: method || 'cash',
      comment,
      month: targetMonth,
      year: targetYear,
      centerId: auth.centerId ? new mongoose.Types.ObjectId(auth.centerId) : null,
    });

    // Update Student
    student.balance = (student.balance || 0) + amount;
    student.lastPaymentDate = new Date();
    await student.save();

    // Update Invoice if provided
    if (invoiceId) {
      const invoice = await Invoice.findOne({ _id: invoiceId, ...centerQuery });
      if (invoice) {
        invoice.paidAmount = (invoice.paidAmount || 0) + amount;
        if (invoice.paidAmount >= invoice.amount) {
          invoice.status = 'paid';
        } else if (invoice.paidAmount > 0) {
          invoice.status = 'partial';
        }
        await invoice.save();
      }
    } else {
      // Auto-apply to pending invoice for this month
      const invoice = await Invoice.findOne({
        studentId,
        month: targetMonth,
        year: targetYear,
        status: { $ne: 'paid' },
        ...centerQuery
      });
      if (invoice) {
        invoice.paidAmount = (invoice.paidAmount || 0) + amount;
        if (invoice.paidAmount >= invoice.amount) {
          invoice.status = 'paid';
        } else if (invoice.paidAmount > 0) {
          invoice.status = 'partial';
        }
        await invoice.save();
      }
    }

    invalidateCache('dashboard:');
    invalidateCache('invoices:');
    invalidateCache('debtors:');

    // Notify via Telegram
    try {
      await notifyPaymentAdded({
        studentName: student.name,
        amount,
        method: method || 'cash',
        date: new Date().toLocaleDateString('uz-UZ'),
        parentChatId: student.parentTelegramChatId,
      });
    } catch (err) {
      console.error('Telegram notification failed:', err);
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Payment POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
