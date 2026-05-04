import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { FreeLesson } from '@/models/FreeLesson';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const list = await FreeLesson.find()
      .sort({ createdAt: -1 })
      .populate('teacherId', 'displayName username')
      .populate('notifyTeacherId', 'displayName username')
      .lean();
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    await connectDB();
    
    const doc = await FreeLesson.create(body);
    return NextResponse.json(doc, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { _id, ...updateData } = body;
    
    await connectDB();
    const doc = await FreeLesson.findByIdAndUpdate(_id, updateData, { new: true });
    
    return NextResponse.json(doc);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
