import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Group } from '@/models/Group';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';
import { serializeGroupForClient } from '@/lib/serializeGroup';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAuthUser(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    await connectDB();

    const query: any = {};
    if (auth!.role !== 'boss' && auth!.centerId) {
      query.centerId = auth!.centerId;
    }

    if (auth!.role === 'teacher') {
      query.$or = [{ teacherUserId: auth!._id }, { teacherUserId2: auth!._id }];
      const groups = await Group.find(query)
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json(groups.map((g) => serializeGroupForClient(g as any, auth!.role)));
    }

    if (auth!.role === 'parent' || auth!.role === 'student') {
      return NextResponse.json([]);
    }

    const groups = await Group.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json(groups.map((g) => serializeGroupForClient(g as any, auth!.role)));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Error fetching groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAdmin(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

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
      lessonDays: data.lessonDays || [],
      startTime: data.startTime || '09:00',
      endTime: data.endTime || '10:30',
      schedule: data.schedule || '',
      weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : [],
      price: data.price || 0,
      teacherSharePercent: data.teacherSharePercent ?? 30,
      teacherPayoutFixed: data.teacherPayoutFixed ?? 0,
      lessonCalendarWeekParity: parity,
      studentIds: [],
      centerId: auth!.centerId,
    });

    await group.save();
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Error creating group' }, { status: 500 });
  }
}
