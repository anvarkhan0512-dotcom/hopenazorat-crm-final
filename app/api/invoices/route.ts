import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Invoice } from '@/models/Invoice';
import { Student } from '@/models/Student';
import { Discount } from '@/models/Discount';
import { invalidateCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const studentId = searchParams.get('studentId');

    const query: any = {};

    if (status) query.status = status;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (studentId) query.studentId = studentId;

    const invoices = await Invoice.find(query)
      .populate('studentId', 'name phone')
      .populate('groupId', 'name')
      .sort({ year: -1, month: -1 })
      .limit(100)
      .lean();

    const result = invoices.map((inv: any) => ({
      _id: inv._id,
      studentId: inv.studentId?._id || inv.studentId,
      studentName: inv.studentId?.name,
      phone: inv.studentId?.phone,
      groupName: inv.groupId?.name,
      month: inv.month,
      year: inv.year,
      amount: inv.amount,
      paidAmount: inv.paidAmount,
      debt: inv.amount - inv.paidAmount,
      status: inv.status,
      createdAt: inv.createdAt,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Error fetching invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();
    
    const { month, year, regenerate } = data;
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const existingInvoices = await Invoice.find({ month: targetMonth, year: targetYear });
    
    if (existingInvoices.length > 0 && !regenerate) {
      return NextResponse.json(
        { error: 'Invoices already exist for this month. Use regenerate: true to recreate.' },
        { status: 400 }
      );
    }

    if (regenerate) {
      await Invoice.deleteMany({ month: targetMonth, year: targetYear });
    }

    const now = new Date();
    const activeDiscounts = await Discount.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean();

    const discountMap = new Map<string, any>();
    for (const discount of activeDiscounts) {
      for (const studentId of discount.studentIds) {
        discountMap.set(studentId.toString(), discount);
      }
    }

    const activeStudents = await Student.find({ status: 'active', monthlyPrice: { $gt: 0 } })
      .populate('groupId')
      .lean();

    const results = {
      generated: 0,
      withDiscounts: 0,
      errors: [] as string[],
    };

    for (const student of activeStudents) {
      try {
        let originalPrice = student.monthlyPrice || 0;
        const group = student.groupId as any;
        if (!originalPrice && group?.price) {
          originalPrice = group.price;
        }

        let amount = originalPrice;
        const discount = discountMap.get(student._id.toString());
        
        if (discount) {
          results.withDiscounts++;
          
          let discountAmount = 0;
          if (discount.discountType === 'percentage') {
            discountAmount = Math.round(originalPrice * (discount.discountValue / 100));
          } else {
            const perStudent = discount.discountValue / discount.studentIds.length;
            discountAmount = Math.min(perStudent, originalPrice);
          }
          
          amount = Math.max(0, originalPrice - discountAmount);
        }

        if (amount <= 0 && originalPrice <= 0) continue;

        const invoice = new Invoice({
          studentId: student._id,
          groupId: student.groupId,
          month: targetMonth,
          year: targetYear,
          amount,
          paidAmount: 0,
          status: 'pending',
        });

        await invoice.save();
        results.generated++;
      } catch (error: any) {
        results.errors.push(error.message);
      }
    }

    invalidateCache('dashboard:');
    invalidateCache('invoices:');

    return NextResponse.json({
      success: true,
      ...results,
      month: targetMonth,
      year: targetYear,
    });
  } catch (error) {
    console.error('Error generating invoices:', error);
    return NextResponse.json({ error: 'Error generating invoices' }, { status: 500 });
  }
}