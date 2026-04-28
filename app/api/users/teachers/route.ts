import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const forbidden = requireAdmin(auth);
    if (forbidden) {
      return NextResponse.json({ error: forbidden.error }, { status: forbidden.status });
    }

    await connectDB();
    const teachers = await User.find({ role: 'teacher' })
      .select('username displayName createdAt')
      .sort({ username: 1 })
      .lean();

    return NextResponse.json(
      teachers.map((t) => ({
        id: t._id.toString(),
        username: t.username,
        displayName: t.displayName || '',
      }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
