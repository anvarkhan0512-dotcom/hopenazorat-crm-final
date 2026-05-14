import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
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

    const centerFilter: any = {};
    if (auth?.centerId) {
      centerFilter.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      centerFilter.$or = [
        { centerId: { $exists: false } },
        { centerId: null }
      ];
    }

    const stats = await Payment.aggregate([
      {
        $match: {
          ...centerFilter,
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
            $sum: { $cond: [{ $eq: ['$method', 'cash'] }, '$amount', 0] }
          },
          card: {
            $sum: { $cond: [{ $eq: ['$method', 'card'] }, '$amount', 0] }
          },
          transfer: {
            $sum: { $cond: [{ $eq: ['$method', 'transfer'] }, '$amount', 0] }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalsByType = await Payment.aggregate([
      {
        $match: {
          ...centerFilter,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$method',
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
