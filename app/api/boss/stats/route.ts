import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireBoss } from '@/lib/auth-server';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { Payment } from '@/models/Payment';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireBoss(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      activeStudents,
      totalStudents,
      inactiveStudents,
      todayRevenue,
      totalParents,
      connectedParents,
      teachers
    ] = await Promise.all([
      Student.countDocuments({ status: 'active' }),
      Student.countDocuments({ status: { $in: ['active', 'inactive'] } }),
      Student.countDocuments({ status: 'inactive' }),
      Payment.aggregate([
        { $match: { createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      User.countDocuments({ role: 'parent' }),
      User.countDocuments({ role: 'parent', telegramChatId: { $exists: true, $ne: '' } }),
      User.find({ role: 'teacher' }).select('displayName avatarUrl').limit(10).lean()
    ]);

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
      }
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
