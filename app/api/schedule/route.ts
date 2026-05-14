import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { 
  getUpcomingPayments, 
  getOverdueStudents, 
  getPaymentStats,
  calculateNextPaymentDate,
  updateAllStudentsPaymentDates 
} from '@/lib/payments';
import { invalidateCache, CacheKeys } from '@/lib/cache';
import { getAuthUser, requireAuthUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAuthUser(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const days = searchParams.get('days');

    const filter: any = {};
    if (auth?.centerId) {
      filter.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      filter.$or = [
        { centerId: { $exists: false } },
        { centerId: null }
      ];
    }

    if (type === 'upcoming') {
      const data = await getUpcomingPayments(parseInt(days || '7'), filter);
      return NextResponse.json(data);
    }

    if (type === 'overdue') {
      const data = await getOverdueStudents(filter);
      return NextResponse.json(data);
    }

    if (type === 'stats') {
      const data = await getPaymentStats(filter);
      return NextResponse.json(data);
    }

    const students = await Student.find({ ...filter, status: 'active' })
      .populate('groupId', 'name')
      .sort({ nextPaymentDate: 1 })
      .lean();

    const result = students.map((s: any) => ({
      _id: s._id,
      name: s.name,
      phone: s.phone,
      groupName: s.groupId?.name,
      monthlyPrice: s.monthlyPrice,
      paymentCycle: s.paymentCycle,
      lessonCount: s.lessonCount,
      customPaymentDays: s.customPaymentDays,
      paymentStartDate: s.paymentStartDate,
      nextPaymentDate: s.nextPaymentDate,
      lastPaymentDate: s.lastPaymentDate,
      notificationEnabled: s.notificationEnabled,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching payment schedule:', error);
    return NextResponse.json({ error: 'Error fetching payment schedule' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAuthUser(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    const filter: any = {};
    if (auth?.centerId) {
      filter.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      filter.$or = [
        { centerId: { $exists: false } },
        { centerId: null }
      ];
    }

    await connectDB();
    const data = await request.json();
    
    const { action, studentId, studentIds, ...updateData } = data;

    if (action === 'update-all') {
      const result = await updateAllStudentsPaymentDates(filter);
      invalidateCache(CacheKeys.DASHBOARD);
      return NextResponse.json(result);
    }

    if (action === 'bulk-update' && studentIds) {
      for (const id of studentIds) {
        const student = await Student.findOne({ _id: id, ...filter });
        if (student) {
          if (updateData.paymentCycle) {
            student.paymentCycle = updateData.paymentCycle;
          }
          if (updateData.customPaymentDays) {
            student.customPaymentDays = updateData.customPaymentDays;
          }
          if (updateData.nextPaymentDate) {
            student.nextPaymentDate = new Date(updateData.nextPaymentDate);
          }
          if (updateData.notificationEnabled !== undefined) {
            student.notificationEnabled = updateData.notificationEnabled;
          }
          if (!student.nextPaymentDate) {
            const anchor = student.paymentStartDate || student.createdAt || new Date();
            student.nextPaymentDate = calculateNextPaymentDate(
              student.lastPaymentDate || new Date(),
              student.paymentCycle as any,
              student.customPaymentDays,
              anchor
            );
          }
          await student.save();
        }
      }
      invalidateCache(CacheKeys.DASHBOARD);
      return NextResponse.json({ success: true });
    }

    if (studentId) {
      const student = await Student.findOne({ _id: studentId, ...filter });
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      if (updateData.basePrice !== undefined) student.basePrice = updateData.basePrice;
      else if (updateData.monthlyPrice !== undefined) student.basePrice = updateData.monthlyPrice;
      if (updateData.paymentCycle) student.paymentCycle = updateData.paymentCycle;
      if (updateData.lessonCount !== undefined) student.lessonCount = updateData.lessonCount;
      if (updateData.customPaymentDays) student.customPaymentDays = updateData.customPaymentDays;
      if (updateData.paymentStartDate) student.paymentStartDate = new Date(updateData.paymentStartDate);
      if (updateData.paymentEndDate) student.paymentEndDate = new Date(updateData.paymentEndDate);
      if (updateData.nextPaymentDate) student.nextPaymentDate = new Date(updateData.nextPaymentDate);
      if (updateData.notificationEnabled !== undefined) student.notificationEnabled = updateData.notificationEnabled;
      if (updateData.parentPhone) student.parentPhone = updateData.parentPhone;
      if (updateData.parentName) student.parentName = updateData.parentName;

      if (!student.nextPaymentDate) {
        student.nextPaymentDate = student.paymentStartDate || new Date();
      }

      await student.save();
      invalidateCache(CacheKeys.DASHBOARD);
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'No studentId provided' }, { status: 400 });
  } catch (error) {
    console.error('Error updating student payment:', error);
    return NextResponse.json({ error: 'Error updating student payment' }, { status: 500 });
  }
}