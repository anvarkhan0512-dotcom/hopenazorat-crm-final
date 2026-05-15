import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireBoss } from '@/lib/auth-server';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { Payment } from '@/models/Payment';
import { User } from '@/models/User';
import { SMSLog } from '@/models/SMSLog';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireBoss(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();

    const query: any = {
      $or: [
        { centerId: { $exists: false } },
        { centerId: null }
      ]
    };

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      activeStudents,
      totalStudents,
      inactiveStudents,
      todayRevenue,
      totalParents,
      connectedParents,
      teachers,
      smsStats
    ] = await Promise.all([
      Student.countDocuments({ ...query, status: 'active' }),
      Student.countDocuments({ ...query, status: { $in: ['active', 'inactive'] } }),
      Student.countDocuments({ ...query, status: 'inactive' }),
      Payment.aggregate([
        { $match: { ...query, createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      User.countDocuments({ ...query, role: 'parent' }),
      User.countDocuments({ ...query, role: 'parent', telegramChatId: { $exists: true, $ne: '' } }),
      User.find({ ...query, role: 'teacher' }).select('displayName avatarUrl').limit(10).lean(),
      SMSLog.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const smsSummary = {
      total: 0,
      sent: 0,
      failed: 0,
      pending: 0
    };

    for (const stat of smsStats) {
      smsSummary.total += stat.count;
      if (stat._id === 'sent') smsSummary.sent = stat.count;
      else if (stat._id === 'failed') smsSummary.failed = stat.count;
      else if (stat._id === 'pending') smsSummary.pending = stat.count;
    }

    return NextResponse.json({
      markaz: {
        todayRevenue: todayRevenue[0]?.total || 0,
        activeStudents
      },
      parents: {
        total: totalParents,
        connected: connectedParents
      },
      teachers: teachers.map((t: any) => ({
        name: t.displayName,
        avatar: t.avatarUrl
      })),
      students: {
        total: totalStudents,
        active: activeStudents,
        inactive: inactiveStudents
      },
      sms: smsSummary
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
