import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Discount } from '@/models/Discount';
import { Student } from '@/models/Student';
import { getDiscountsSummary, getDiscountReasons } from '@/lib/discount';
import { invalidateCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const reason = searchParams.get('reason');

    const query: any = {};
    
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

    const result = discounts.map((d: any) => ({
      _id: d._id,
      familyId: d.familyId,
      familyName: d.familyName,
      studentIds: d.studentIds,
      students: d.studentIds.map((s: any) => ({
        _id: s._id,
        name: s.name,
        phone: s.phone,
      })),
      discountType: d.discountType,
      discountValue: d.discountValue,
      originalTotal: d.originalTotal,
      discountAmount: d.discountAmount,
      finalTotal: d.finalTotal,
      reason: d.reason,
      startDate: d.startDate,
      endDate: d.endDate,
      isActive: d.isActive,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json({ error: 'Error fetching discounts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();
    
    const {
      familyName,
      studentIds,
      discountType,
      discountValue,
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

    const students = await Student.find({
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
      discountAmount = Math.round(originalTotal * (discountValue / 100));
    } else {
      discountAmount = Math.min(discountValue, originalTotal);
    }

    const finalTotal = originalTotal - discountAmount;

    const exists = await Discount.findOne({ familyName });
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
      originalTotal,
      discountAmount,
      finalTotal,
      reason,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: true,
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