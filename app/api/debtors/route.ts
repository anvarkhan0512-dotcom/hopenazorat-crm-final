import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Invoice } from '@/models/Invoice';
import { getCached, setCache, invalidateCache, CacheKeys } from '@/lib/cache';
import { getAuthUser, requireAuthUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAuthUser(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

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

    const centerId = auth!.centerId;
    if (auth!.role !== 'boss') {
      if (centerId) {
        query.centerId = centerId;
      } else {
        query.centerId = { $in: [null, undefined] };
      }
    }

    if (groupId) {
      query.groupId = groupId;
    }

    if (status) {
      query.status = status;
    }

    const [invoices, summary] = await Promise.all([
      Invoice.find(query)
        .populate('studentId', 'name phone monthlyPrice basePrice')
        .populate('groupId', 'name')
        .sort({ amount: -1 })
        .lean(),
      Invoice.aggregate([
        { $match: query },
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

    const debtors = invoices.map((inv: any) => {
      const student = inv.studentId;
      const originalPrice = student?.basePrice || student?.monthlyPrice || inv.amount;
      const totalDiscount = Math.max(0, originalPrice - inv.amount);

      return {
        _id: inv._id,
        invoiceId: inv._id,
        studentId: student?._id || inv.studentId,
        studentName: student?.name,
        phone: student?.phone,
        groupName: inv.groupId?.name,
        originalPrice,
        totalDiscount,
        amount: inv.amount,
        paidAmount: inv.paidAmount,
        debt: inv.amount - inv.paidAmount,
        status: inv.status,
      };
    });

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