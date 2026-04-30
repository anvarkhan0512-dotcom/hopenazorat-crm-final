import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Group } from '@/models/Group';
import { Student } from '@/models/Student';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const group = await Group.findByIdAndUpdate(
      params.id,
      {
        name: data.name,
        teacherName: data.teacherName,
        teacherUserId: data.teacherUserId || null,
        teacherUserId2: data.teacherUserId2 || null,
        schedule: data.schedule,
        weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : [],
        price: data.price,
        teacherSharePercent: data.teacherSharePercent ?? 30,
        teacherPayoutFixed: data.teacherPayoutFixed ?? 0,
        lessonCalendarWeekParity: parity,
      },
      { new: true }
    );

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    return NextResponse.json({ error: 'Error updating group' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    
    await Student.updateMany(
      { groupId: params.id },
      { $set: { groupId: null } }
    );

    await Group.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Error deleting group' }, { status: 500 });
  }
}