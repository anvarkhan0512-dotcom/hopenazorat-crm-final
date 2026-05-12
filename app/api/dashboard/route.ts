export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { Payment } from '@/models/Payment';
import { Invoice } from '@/models/Invoice';
import { getCached, setCache, CacheKeys } from '@/lib/cache';
import { getAdminFinanceOverview } from '@/lib/teacherFinance';
import { getAuthUser, requireAuthUser } from '@/lib/auth-server';
import { type NextRequest } from 'next/server';

function padDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthLabel(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAuthUser(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const centerId = auth!.centerId;
    const cacheKey = `dashboard:${centerId || 'none'}`;
    const cached = getCached<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    await connectDB();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const query: any = {};
    if (auth!.role !== 'boss') {
      if (centerId) {
        query.centerId = centerId;
      } else {
        query.$or = [
          { centerId: { $exists: false } },
          { centerId: null }
        ];
      }
    }

    const [
      totalStudents,
      activeStudents,
      totalGroups,
      activeGroups,
      paymentsAgg,
      debtorsCount,
      last7Agg,
      last6Agg,
      financeData,
      allStudents,
    ] = await Promise.all([
      Student.countDocuments(query),
      Student.countDocuments({ ...query, status: 'active' }),
      Group.countDocuments(query),
      Group.countDocuments({ ...query, isActive: true }),
      Payment.aggregate([
        { $match: { ...query, month: currentMonth, year: currentYear } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.countDocuments({
        ...query,
        month: currentMonth,
        year: currentYear,
        status: { $ne: 'paid' },
      }),
      Payment.aggregate([
        {
          $match: {
            ...query,
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0),
            },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            income: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Payment.aggregate([
        {
          $match: {
            ...query,
            createdAt: {
              $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0),
            },
          },
        },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            income: { $sum: '$amount' },
          },
        },
      ]),
      getAdminFinanceOverview(currentMonth, currentYear, centerId || undefined),
      Student.find({ ...query, status: 'active' }).select('basePrice discountAmount schoolNumber').lean(),
    ]);

    const schoolAgg = await Student.aggregate([
      { $match: { ...query, status: 'active', schoolNumber: { $ne: '' } } },
      { $group: { _id: '$schoolNumber', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    const schoolStats = schoolAgg.map(s => ({ school: s._id, count: s.count }));

    const paymentsThisMonth = paymentsAgg[0]?.total || 0;

    const last7Map = new Map<string, number>(
      last7Agg.map((r: { _id: string; income: number }) => [r._id, r.income])
    );
    const last7DaysIncome: { day: string; income: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = padDay(d);
      last7DaysIncome.push({ day: key, income: last7Map.get(key) || 0 });
    }

    const last6MonthsIncome: { month: string; income: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const found = last6Agg.find(
        (r: { _id: { year: number; month: number }; income: number }) =>
          r._id.year === y && r._id.month === m
      );
      last6MonthsIncome.push({
        month: monthLabel(y, m),
        income: found?.income || 0,
      });
    }

    const totalExpectedInflow = allStudents.reduce((acc, s) => acc + (Number(s.basePrice) || 0), 0);
    const totalDiscounts = allStudents.reduce((acc, s) => acc + (Number(s.discountAmount) || 0), 0);

    const payload = {
      totalStudents,
      activeStudents,
      totalGroups,
      activeGroups,
      paymentsThisMonth,
      debtorsCount,
      last7DaysIncome,
      last6MonthsIncome,
      schoolStats,
      financeSummary: {
        totalExpected: totalExpectedInflow - totalDiscounts,
        totalDiscounts,
        teacherPayouts: financeData.summary.totalTeacherPayouts,
        netProfit: financeData.summary.totalCenter,
        totalInflow: financeData.summary.totalInflow,
      },
      paidCount: await Invoice.countDocuments({ ...query, month: currentMonth, year: currentYear, status: 'paid' }),
      unpaidCount: await Invoice.countDocuments({ ...query, month: currentMonth, year: currentYear, status: 'unpaid' }),
    };

    setCache(cacheKey, payload, 60 * 1000);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Dashboard stats failed' }, { status: 500 });
  }
}
