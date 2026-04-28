import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Invoice } from '@/models/Invoice';
import { Payment } from '@/models/Payment';
import { invalidateCache } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const invoice = await Invoice.findById(params.id)
      .populate('studentId', 'name phone')
      .populate('groupId', 'name')
      .lean();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const payments = await Payment.find({
      studentId: (invoice as any).studentId,
      month: invoice.month,
      year: invoice.year,
    }).lean();

    return NextResponse.json({
      ...invoice,
      payments,
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Error fetching invoice' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const data = await request.json();
    
    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (data.amount !== undefined) {
      invoice.amount = data.amount;
    }

    if (data.paidAmount !== undefined) {
      invoice.paidAmount += data.paidAmount;
    }

    if (invoice.paidAmount >= invoice.amount) {
      invoice.status = 'paid';
      invoice.paidAmount = invoice.amount;
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'partial';
    }

    await invoice.save();
    invalidateCache('dashboard:');
    invalidateCache('invoices:');

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Error updating invoice' }, { status: 500 });
  }
}