import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { Payment } from '@/models/Payment';
import { Invoice } from '@/models/Invoice';
import { getCached, setCache, CacheKeys } from '@/lib/cache';

/** Stats use aggregation / countDocuments only (plain JS results, no Mongoose hydration). */

function padDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthLabel(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const cached = getCached<Record<string, unknown>>(CacheKeys.DASHBOARD);
    if (cached) {
      return NextResponse.json(cached);
    }

    await connectDB();

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const [
      totalStudents,
      activeStudents,
      totalGroups,
      activeGroups,
      paymentsAgg,
      debtorsCount,
      last7Agg,
      last6Agg,
    ] = await Promise.all([
      Student.countDocuments({}),
      Student.countDocuments({ status: 'active' }),
      Group.countDocuments({}),
      Group.countDocuments({ isActive: true }),
      Payment.aggregate([
        { $match: { month: currentMonth, year: currentYear } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Invoice.countDocuments({
        month: currentMonth,
        year: currentYear,
        status: { $ne: 'paid' },
      }),
      Payment.aggregate([
        {
          $match: {
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
    ]);

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

    const payload = {
      totalStudents,
      activeStudents,
      totalGroups,
      activeGroups,
      paymentsThisMonth,
      debtorsCount,
      last7DaysIncome,
      last6MonthsIncome,
    };

    setCache(CacheKeys.DASHBOARD, payload, 60 * 1000);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Dashboard stats failed' }, { status: 500 });
  }
}
