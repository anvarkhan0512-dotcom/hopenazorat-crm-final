import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';
import { getAdminFinanceOverview } from '@/lib/teacherFinance';

/** Alias of admin finances (lean-backed aggregation in `getAdminFinanceOverview`). */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const forbidden = requireAdmin(auth);
    if (forbidden) {
      return NextResponse.json({ error: forbidden.error }, { status: forbidden.status });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '', 10) || new Date().getMonth() + 1;
    const year = parseInt(searchParams.get('year') || '', 10) || new Date().getFullYear();

    const data = await getAdminFinanceOverview(month, year);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
