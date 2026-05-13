import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Group } from '@/models/Group';
import { getAuthUser, requireAuthUser, requireAdmin, isAdminRole } from '@/lib/auth-server';
import { serializeGroupForClient } from '@/lib/serializeGroup';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAuthUser(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    await connectDB();

    const query: any = {};
    if (auth?.centerId) {
      query.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      query.$or = [
        { centerId: { $exists: false } },
        { centerId: null }
      ];
    }

    if (auth!.role === 'teacher') {
      const teacherFilter = { $or: [{ teacherUserId: auth!._id }, { teacherUserId2: auth!._id }] };
      
      const finalQuery = { ...query, ...teacherFilter };
      
      const groups = await Group.find(finalQuery)
        .sort({ createdAt: -1 })
        .lean();
      const items = groups.map((g) => serializeGroupForClient(g as any, auth!.role));
      return NextResponse.json({ items });
    }

    if (auth!.role === 'parent' || auth!.role === 'student') {
      return NextResponse.json({ items: [] });
    }

    const groups = await Group.find(query).sort({ createdAt: -1 }).lean();
    const items = groups.map((g) => serializeGroupForClient(g as any, auth!.role));
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Error fetching groups', items: [] }, { status: 500 });
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
      centerId: auth!.centerId || null,
    });

    await group.save();
    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Error creating group' }, { status: 500 });
  }
}
