import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireBoss } from '@/lib/auth-server';
import connectDB from '@/lib/db';
import { Center } from '@/models/Center';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireBoss(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const id = params.id;
    const body = await request.json();

    await connectDB();
    const center = await Center.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    );

    if (!center) {
      return NextResponse.json({ error: 'Markaz topilmadi' }, { status: 404 });
    }

    return NextResponse.json({ success: true, center });
  } catch (error: any) {
    console.error('Update center error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
