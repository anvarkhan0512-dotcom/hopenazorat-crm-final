import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Staff } from '@/models/Staff';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const body = await request.json();
    await connectDB();
    const doc = await Staff.findByIdAndUpdate(
      params.id,
      {
        fullName: body.fullName,
        position: body.position,
        monthlySalary: Number(body.monthlySalary) || 0,
        phone: body.phone != null ? String(body.phone) : '',
        userId: body.userId || null,
      },
      { new: true }
    );
    if (!doc) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();
    await Staff.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server' }, { status: 500 });
  }
}
