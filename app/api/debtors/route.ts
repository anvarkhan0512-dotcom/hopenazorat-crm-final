import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Invoice } from '@/models/Invoice';
import { getCached, setCache, invalidateCache, CacheKeys } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const groupId = searchParams.get('groupId');
    const status = searchParams.get('status');

    const currentMonth = parseInt(month || '') || new Date().getMonth() + 1;
    const currentYear = parseInt(year || '') || new Date().getFullYear();

    const cacheKey = `debtors:${currentMonth}:${currentYear}:${groupId || 'all'}:${status || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    await connectDB();

    const query: any = {
      month: currentMonth,
      year: currentYear,
      status: { $ne: 'paid' },
    };

    if (groupId) {
      query.groupId = groupId;
    }

    if (status) {
      query.status = status;
    }

    const [invoices, summary] = await Promise.all([
      Invoice.find(query)
        .populate('studentId', 'name phone')
        .populate('groupId', 'name')
        .sort({ amount: -1 })
        .lean(),
      Invoice.aggregate([
        { $match: { month: currentMonth, year: currentYear } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalPaid: { $sum: '$paidAmount' },
          },
        },
      ]),
    ]);

    const debtors = invoices.map((inv: any) => ({
      _id: inv._id,
      invoiceId: inv._id,
      studentId: inv.studentId?._id || inv.studentId,
      studentName: inv.studentId?.name,
      phone: inv.studentId?.phone,
      groupName: inv.groupId?.name,
      amount: inv.amount,
      paidAmount: inv.paidAmount,
      debt: inv.amount - inv.paidAmount,
      status: inv.status,
    }));

    const summaryResult = {
      pending: 0,
      partial: 0,
      paid: 0,
      totalDebt: 0,
      totalPaid: 0,
    };

    for (const s of summary) {
      if (s._id === 'pending') {
        summaryResult.pending = s.count;
        summaryResult.totalDebt += s.totalAmount;
      } else if (s._id === 'partial') {
        summaryResult.partial = s.count;
        summaryResult.totalDebt += s.totalAmount - s.totalPaid;
        summaryResult.totalPaid += s.totalPaid;
      } else {
        summaryResult.paid = s.count;
        summaryResult.totalPaid += s.totalPaid;
      }
    }

    const result = {
      month: currentMonth,
      year: currentYear,
      debtors,
      summary: summaryResult,
    };

    setCache(cacheKey, result, 300 * 1000);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching debtors:', error);
    return NextResponse.json({ error: 'Error fetching debtors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { generateForMonth, generateForYear } = await request.json();

    const targetMonth = generateForMonth || new Date().getMonth() + 1;
    const targetYear = generateForYear || new Date().getFullYear();

    invalidateCache('debtors:');
    invalidateCache(CacheKeys.DASHBOARD);

    return NextResponse.json({
      success: true,
      month: targetMonth,
      year: targetYear,
    });
  } catch (error) {
    console.error('Error processing debtors:', error);
    return NextResponse.json({ error: 'Error processing debtors' }, { status: 500 });
  }
}