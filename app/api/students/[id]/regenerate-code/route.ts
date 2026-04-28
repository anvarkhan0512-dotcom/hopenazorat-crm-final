import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';
import { ensureUniqueParentCode } from '@/lib/parentCode';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const student = await Student.findById(params.id);
    if (!student) return NextResponse.json({ error: 'Topilmadi' }, { status: 404 });

    student.parentAccessCode = await ensureUniqueParentCode();
    await student.save();

    return NextResponse.json({ parentAccessCode: student.parentAccessCode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
