export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { Discount } from '@/models/Discount';
import { Student } from '@/models/Student';
import { getAuthUser } from '@/lib/auth-server';
import { invalidateCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const reason = searchParams.get('reason');

    const query: any = {};
    if (auth?.centerId) {
      query.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      query.$or = [{ centerId: { $exists: false } }, { centerId: null }];
    }
    
    if (active === 'true') {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    }
    if (reason) query.reason = reason;

    const discounts = await Discount.find(query)
      .populate('studentIds', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    const items = discounts.map((d: any) => ({
      _id: d._id,
      familyId: d.familyId,
      familyName: d.familyName,
      studentIds: d.studentIds,
      students: (d.studentIds || []).map((s: any) => ({
        _id: s?._id,
        name: s?.name,
        phone: s?.phone,
      })),
      discountType: d.discountType,
      discountValue: d.discountValue,
      originalTotal: d.originalTotal,
      discountAmount: d.discountAmount,
      finalTotal: d.finalTotal,
      reason: d.reason,
      isDoubleSubject: d.isDoubleSubject,
      applyType: d.applyType,
      startDate: d.startDate,
      endDate: d.endDate,
      isActive: d.isActive,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json({ error: 'Error fetching discounts', items: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const data = await request.json();
    
    const {
      familyName,
      studentIds,
      discountType,
      discountValue,
      isDoubleSubject,
      applyType,
      reason,
      startDate,
      endDate,
    } = data;

    if (!familyName || !studentIds?.length || !discountValue || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const centerQuery: any = {};
    if (auth?.centerId) {
      centerQuery.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      centerQuery.$or = [{ centerId: { $exists: false } }, { centerId: null }];
    }

    const students = await Student.find({
      ...centerQuery,
      _id: { $in: studentIds },
      status: 'active',
    }).lean();

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No valid students found' },
        { status: 400 }
      );
    }

    const originalTotal = students.reduce((sum, s) => sum + (s.monthlyPrice || 0), 0);
    let discountAmount = 0;
    
    if (discountType === 'percentage') {
      if (applyType === 'separate') {
        discountAmount = students.reduce((sum, s) => sum + Math.round((s.monthlyPrice || 0) * (discountValue / 100)), 0);
      } else {
        discountAmount = Math.round(originalTotal * (discountValue / 100));
      }
    } else {
      if (applyType === 'separate') {
        discountAmount = discountValue * students.length;
      } else {
        discountAmount = Math.min(discountValue, originalTotal);
      }
    }

    if (isDoubleSubject) {
      discountAmount *= 2;
    }

    const finalTotal = originalTotal - discountAmount;

    const exists = await Discount.findOne({ ...centerQuery, familyName });
    if (exists) {
      return NextResponse.json(
        { error: 'Family name already exists' },
        { status: 400 }
      );
    }

    const discount = new Discount({
      studentIds,
      familyName,
      discountType: discountType || 'percentage',
      discountValue,
      isDoubleSubject: !!isDoubleSubject,
      applyType: applyType || 'total',
      originalTotal,
      discountAmount,
      finalTotal,
      reason,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
      centerId: auth.centerId ? new mongoose.Types.ObjectId(auth.centerId) : null
    });

    await discount.save();

    invalidateCache('dashboard:');
    invalidateCache('discounts:');
    invalidateCache('invoices:');

    return NextResponse.json({
      success: true,
      discount: {
        _id: discount._id,
        familyName: discount.familyName,
        discountAmount: discount.discountAmount,
        finalTotal: discount.finalTotal,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating discount:', error);
    return NextResponse.json({ error: 'Error creating discount' }, { status: 500 });
  }
}
