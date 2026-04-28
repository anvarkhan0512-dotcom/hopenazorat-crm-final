import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Group } from '@/models/Group';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    if (auth.role === 'teacher') {
      const groups = await Group.find({ teacherUserId: auth._id }).sort({ createdAt: -1 }).lean();
      return NextResponse.json(groups);
    }

    if (auth.role === 'parent' || auth.role === 'student') {
      return NextResponse.json([]);
    }

    const groups = await Group.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Error fetching groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const data = await request.json();

    const group = new Group({
      name: data.name,
      teacherName: data.teacherName,
      teacherUserId: data.teacherUserId || undefined,
      schedule: data.schedule || '',
      price: data.price || 0,
      studentIds: [],
    });

    await group.save();
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Error creating group' }, { status: 500 });
  }
}
