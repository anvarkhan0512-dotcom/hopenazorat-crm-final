import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireBoss } from '@/lib/auth-server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { Student } from '@/models/Student';
import { LoginHistory } from '@/models/LoginHistory';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireBoss(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();

    const parents = await User.find({ role: 'parent' })
      .select('username displayName avatarUrl telegramChatId linkedStudentIds createdAt')
      .lean();

    const result = await Promise.all(
      parents.map(async (p: any) => {
        const lastLogin = await LoginHistory.findOne({ userId: p._id })
          .sort({ timestamp: -1 })
          .select('timestamp')
          .lean();

        const children = await Student.find({ parentUserId: p._id })
          .select('name phones')
          .lean();

        return {
          _id: p._id.toString(),
          username: p.username,
          displayName: p.displayName || '',
          avatarUrl: p.avatarUrl || '',
          telegramChatId: p.telegramChatId || '',
          linkedStudentIds: p.linkedStudentIds?.map((id: any) => id.toString()) || [],
          children: children.map((c: any) => ({
            name: c.name,
            phone: c.phones?.[0] || c.phone || '',
          })),
          lastLogin: lastLogin?.timestamp || null,
          createdAt: p.createdAt,
          revealablePassword: p.revealablePassword || '',
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Boss parents error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
