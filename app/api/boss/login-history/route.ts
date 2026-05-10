import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireBoss } from '@/lib/auth-server';
import { LoginHistory } from '@/models/LoginHistory';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireBoss(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    await connectDB();

    const history = await LoginHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    return NextResponse.json(history);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
