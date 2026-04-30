import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Staff } from '@/models/Staff';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();
    const list = await Staff.find().sort({ position: 1, fullName: 1 }).lean();
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const body = await request.json();
    const { fullName, position, monthlySalary, phone, userId } = body;
    if (!fullName || !position) {
      return NextResponse.json({ error: 'fullName va position majburiy' }, { status: 400 });
    }

    await connectDB();
    const doc = await Staff.create({
      fullName: String(fullName),
      position,
      monthlySalary: Number(monthlySalary) || 0,
      phone: phone ? String(phone) : '',
      userId: userId || undefined,
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server' }, { status: 500 });
  }
}
