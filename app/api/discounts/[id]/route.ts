import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Discount } from '@/models/Discount';
import { Student } from '@/models/Student';
import { invalidateCache } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const discount = await Discount.findById(params.id)
      .populate('studentIds', 'name phone monthlyPrice')
      .lean();

    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    const students = discount.studentIds as any[];
    
    return NextResponse.json({
      _id: discount._id,
      familyId: discount.familyId,
      familyName: discount.familyName,
      students: students.map((s) => ({
        _id: s._id,
        name: s.name,
        phone: s.phone,
        monthlyPrice: s.monthlyPrice,
      })),
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      originalTotal: discount.originalTotal,
      discountAmount: discount.discountAmount,
      finalTotal: discount.finalTotal,
      reason: discount.reason,
      startDate: discount.startDate,
      endDate: discount.endDate,
      isActive: discount.isActive,
    });
  } catch (error) {
    console.error('Error fetching discount:', error);
    return NextResponse.json({ error: 'Error fetching discount' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const data = await request.json();
    
    const discount = await Discount.findById(params.id);
    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    if (data.discountValue !== undefined || data.discountType) {
      const students = await Student.find({
        _id: { $in: discount.studentIds },
      }).lean();

      const originalTotal = students.reduce((sum, s) => sum + (s.monthlyPrice || 0), 0);
      const discountValue = data.discountValue ?? discount.discountValue;
      const discountType = data.discountType ?? discount.discountType;
      
      let discountAmount = 0;
      if (discountType === 'percentage') {
        discountAmount = Math.round(originalTotal * (discountValue / 100));
      } else {
        discountAmount = Math.min(discountValue, originalTotal);
      }

      discount.originalTotal = originalTotal;
      discount.discountAmount = discountAmount;
      discount.finalTotal = originalTotal - discountAmount;
    }

    if (data.discountType) discount.discountType = data.discountType;
    if (data.discountValue !== undefined) discount.discountValue = data.discountValue;
    if (data.reason) discount.reason = data.reason;
    if (data.startDate) discount.startDate = new Date(data.startDate);
    if (data.endDate) discount.endDate = new Date(data.endDate);
    if (data.isActive !== undefined) discount.isActive = data.isActive;

    await discount.save();

    invalidateCache('dashboard:');
    invalidateCache('discounts:');
    invalidateCache('invoices:');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating discount:', error);
    return NextResponse.json({ error: 'Error updating discount' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const discount = await Discount.findByIdAndDelete(params.id);
    
    if (!discount) {
      return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
    }

    invalidateCache('dashboard:');
    invalidateCache('discounts:');
    invalidateCache('invoices:');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting discount:', error);
    return NextResponse.json({ error: 'Error deleting discount' }, { status: 500 });
  }
}