import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Group } from '@/models/Group';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';
import { serializeGroupForClient } from '@/lib/serializeGroup';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    if (auth.role === 'teacher') {
      const groups = await Group.find({
        $or: [{ teacherUserId: auth._id }, { teacherUserId2: auth._id }],
      })
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json(groups.map((g) => serializeGroupForClient(g as any, auth.role)));
    }

    if (auth.role === 'parent' || auth.role === 'student') {
      return NextResponse.json([]);
    }

    const groups = await Group.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(groups.map((g) => serializeGroupForClient(g as any, auth.role)));
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

    const parity = ['all', 'odd', 'even'].includes(data.lessonCalendarWeekParity)
      ? data.lessonCalendarWeekParity
      : 'all';

    const group = new Group({
      name: data.name,
      teacherName: data.teacherName,
      teacherUserId: data.teacherUserId || undefined,
      teacherUserId2: data.teacherUserId2 || undefined,
      schedule: data.schedule || '',
      weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : [],
      price: data.price || 0,
      teacherSharePercent: data.teacherSharePercent ?? 30,
      teacherPayoutFixed: data.teacherPayoutFixed ?? 0,
      lessonCalendarWeekParity: parity,
      studentIds: [],
    });

    await group.save();
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Error creating group' }, { status: 500 });
  }
}
