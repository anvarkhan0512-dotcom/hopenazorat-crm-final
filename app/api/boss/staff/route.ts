import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireBoss } from '@/lib/auth-server';
import { User } from '@/models/User';
import { LoginHistory } from '@/models/LoginHistory';
import { Payment } from '@/models/Payment';
import { Group } from '@/models/Group';
import { Student } from '@/models/Student';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireBoss(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');

    await connectDB();

    const query: any = {};
    if (roleFilter === 'teacher') {
      query.role = 'teacher';
    } else if (roleFilter === 'admin' || roleFilter === 'admin,manager') {
      query.role = { $in: ['admin', 'manager'] };
    } else {
      query.role = { $in: ['admin', 'manager', 'teacher'] };
    }

    const staff = await User.find(query)
      .select('-password revealablePassword')
      .lean();

    const staffWithStats = await Promise.all(
      staff.map(async (s: any) => {
        const lastLogin = await LoginHistory.findOne({ userId: s._id })
          .sort({ timestamp: -1 })
          .select('timestamp')
          .lean();

        let monthlyEarnings = 0;
        let paymentsReceived = 0;
        let paymentsCount = 0;

        if (s.role === 'teacher') {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          const myGroups = await Group.find({
            $or: [{ teacherUserId: s._id }, { teacherUserId2: s._id }],
          }).lean();

          const groupIds = myGroups.map((g: any) => g._id);

          if (groupIds.length > 0) {
            const students = await Student.find({
              groupId: { $in: groupIds },
              status: 'active',
            }).lean();

            const studentIds = students.map((st: any) => st._id);

            if (studentIds.length > 0) {
              const payments = await Payment.find({
                studentId: { $in: studentIds },
                createdAt: { $gte: startOfMonth },
              }).lean();

              paymentsCount = payments.length;
              const totalAmount = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

              const sharePercent = myGroups[0]?.teacherSharePercent || 30;
              monthlyEarnings = Math.round((totalAmount * sharePercent) / 100);
              paymentsReceived = totalAmount;
            }
          }
        }

        return {
          _id: s._id.toString(),
          username: s.username,
          role: s.role,
          displayName: s.displayName || '',
          avatarUrl: s.avatarUrl || '',
          telegramChatId: s.telegramChatId || '',
          revealablePassword: s.revealablePassword || '',
          lastLogin: lastLogin?.timestamp || null,
          loginCount: await LoginHistory.countDocuments({ userId: s._id }),
          monthlyEarnings,
          paymentsReceived,
          paymentsCount,
          createdAt: s.createdAt,
        };
      })
    );

    return NextResponse.json(staffWithStats);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
