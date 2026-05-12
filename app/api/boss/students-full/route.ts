import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireBoss } from '@/lib/auth-server';
import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { User } from '@/models/User';
import { Group } from '@/models/Group';
import { Payment } from '@/models/Payment';
import { Homework } from '@/models/Homework';
import { LoginHistory } from '@/models/LoginHistory';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireBoss(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();

    const students = await Student.find({})
      .populate('groupId', 'name')
      .populate('studentUserId', 'username revealablePassword')
      .lean();

    const result = await Promise.all(
      students.map(async (s: any) => {
        const lastPayment = await Payment.findOne({ studentId: s._id })
          .sort({ createdAt: -1 })
          .select('amount createdAt')
          .lean();

        const overduePayments = await Payment.countDocuments({
          studentId: s._id,
          createdAt: { $lt: s.nextPaymentDate },
        });

        const recentHomework = await Homework.findOne({ studentId: s._id })
          .sort({ createdAt: -1 })
          .select('status createdAt')
          .lean();

        const lastLogin = s.studentUserId
          ? await LoginHistory.findOne({ userId: (s.studentUserId as any)._id })
              .sort({ timestamp: -1 })
              .select('timestamp')
              .lean()
          : null;

        return {
          _id: s._id.toString(),
          name: s.name,
          phone: s.phone || '',
          phones: s.phones || [],
          groupId: s.groupId?._id?.toString() || null,
          groupName: s.groupId?.name || '',
          status: s.status,
          arrivalDate: s.arrivalDate,
          monthlyPrice: s.monthlyPrice || 0,
          basePrice: s.basePrice || 0,
          nextPaymentDate: s.nextPaymentDate,
          lastPaymentDate: lastPayment?.createdAt || null,
          lastPaymentAmount: lastPayment?.amount || 0,
          overduePayments,
          parentName: s.parentName || '',
          parentPhone: s.parentPhone || '',
          studentUserId: (s.studentUserId as any)?._id?.toString() || null,
          studentUsername: (s.studentUserId as any)?.username || '',
          studentPassword: (s.studentUserId as any)?.revealablePassword || '',
          lastLogin: lastLogin?.timestamp || null,
          homeworkStatus: recentHomework?.status || 'no-homework',
          createdAt: s.createdAt,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Boss students-full error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
