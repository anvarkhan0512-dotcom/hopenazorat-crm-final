import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';
import { getGroupFinanceSnapshot } from '@/lib/teacherFinance';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();
    const gid = new mongoose.Types.ObjectId(params.id);
    const snap = await getGroupFinanceSnapshot(gid);
    if (!snap) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });
    return NextResponse.json(snap);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server' }, { status: 500 });
  }
}
