import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Payment } from '@/models/Payment';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month'; // day, week, month, year

    const now = new Date();
    let startDate = new Date();

    if (range === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (range === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const stats = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { 
              format: range === 'year' ? '%Y-%m' : '%Y-%m-%d', 
              date: '$createdAt' 
            }
          },
          cash: {
            $sum: { $cond: [{ $eq: ['$type', 'cash'] }, '$amount', 0] }
          },
          card: {
            $sum: { $cond: [{ $eq: ['$type', 'card'] }, '$amount', 0] }
          },
          transfer: {
            $sum: { $cond: [{ $eq: ['$type', 'transfer'] }, '$amount', 0] }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalsByType = await Payment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' }
        }
      }
    ]);

    return NextResponse.json({
      chartData: stats,
      totalsByType: totalsByType.reduce((acc: any, curr: any) => {
        acc[curr._id] = curr.total;
        return acc;
      }, { cash: 0, card: 0, transfer: 0 })
    });
  } catch (error) {
    console.error('Finance stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch finance stats' }, { status: 500 });
  }
}
