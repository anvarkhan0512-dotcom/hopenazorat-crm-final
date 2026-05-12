import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Invoice } from '@/models/Invoice';
import { Student } from '@/models/Student';
import { Discount } from '@/models/Discount';
import { getAuthUser, requireAuthUser, requireAdmin } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAuthUser(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const studentId = searchParams.get('studentId');

    const query: any = {};

    const centerId = auth!.centerId;
    if (auth!.role !== 'boss') {
      if (centerId) {
        query.centerId = centerId;
      } else {
        query.$or = [
          { centerId: { $exists: false } },
          { centerId: null }
        ];
      }
    }

    if (status) query.status = status;
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (studentId) query.studentId = studentId;

    const invoices = await Invoice.find(query)
      .populate('studentId', 'name phone monthlyPrice basePrice discountAmount extraDiscount')
      .populate('groupId', 'name')
      .sort({ year: -1, month: -1 })
      .limit(100)
      .lean();

    const result = invoices.map((inv: any) => {
      const student = inv.studentId;
      const originalPrice = student?.basePrice || student?.monthlyPrice || inv.amount;
      
      // Calculate total discount as the difference between original base price and the actual invoice amount
      const totalDiscount = Math.max(0, originalPrice - inv.amount);
      const toPay = inv.amount;
      
      return {
        _id: inv._id,
        studentId: student?._id || inv.studentId,
        studentName: student?.name,
        phone: student?.phone,
        groupName: inv.groupId?.name,
        month: inv.month,
        year: inv.year,
        originalPrice,
        totalDiscount,
        toPay,
        amount: inv.amount,
        paidAmount: inv.paidAmount,
        debt: inv.amount - inv.paidAmount,
        status: inv.status,
        createdAt: inv.createdAt,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Error fetching invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const authErr = requireAdmin(auth);
    if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

    await connectDB();
    const data = await request.json();
    
    const { month, year, regenerate } = data;
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const query: any = { month: targetMonth, year: targetYear };
    const centerId = auth!.centerId;
    if (auth!.role !== 'boss') {
      if (centerId) {
        query.centerId = centerId;
      } else {
        query.$or = [
          { centerId: { $exists: false } },
          { centerId: null }
        ];
      }
    }

    const existingInvoices = await Invoice.find(query);
    
    if (existingInvoices.length > 0 && !regenerate) {
      return NextResponse.json(
        { error: 'Invoices already exist for this month. Use regenerate: true to recreate.' },
        { status: 400 }
      );
    }

    if (regenerate) {
      await Invoice.deleteMany(query);
    }

    const now = new Date();
    const discountQuery: any = {
      isActive: true,
      $or: [
        { endDate: { $gte: now } },
        { endDate: null }
      ]
    };
    if (auth!.role !== 'boss') {
      if (centerId) {
        discountQuery.centerId = centerId;
      } else {
        discountQuery.$or = [
          { centerId: { $exists: false } },
          { centerId: null }
        ];
      }
    }

    const activeDiscounts = await Discount.find(discountQuery).lean();

    const discountMap = new Map<string, any>();
    for (const discount of activeDiscounts) {
      const ids = discount.studentIds || [];
      // Also check for familyStudentIds if it exists (per user request, though not in schema)
      const familyIds = (discount as any).familyStudentIds || [];
      const allIds = [...ids, ...familyIds];
      
      for (const studentId of allIds) {
        discountMap.set(studentId.toString(), discount);
      }
    }

    const studentQuery: any = { status: 'active', monthlyPrice: { $gt: 0 } };
    if (auth!.role !== 'boss') {
      if (centerId) {
        studentQuery.centerId = centerId;
      } else {
        studentQuery.$or = [
          { centerId: { $exists: false } },
          { centerId: null }
        ];
      }
    }

    const activeStudents = await Student.find(studentQuery)
      .populate('groupId')
      .lean();

    const results = {
      generated: 0,
      withDiscounts: 0,
      errors: [] as string[],
    };

    for (const student of activeStudents) {
      try {
        let amount = student.monthlyPrice || 0;
        
        // Check for external discounts
        const discount = discountMap.get(student._id.toString());
        let externalDiscountAmount = 0;
        
        if (discount) {
          const dType = discount.discountType;
          const dValue = discount.discountValue || (discount as any).amount || 0;
          const studentIdsCount = (discount.studentIds?.length || 0) + ((discount as any).familyStudentIds?.length || 0) || 1;

          if (dType === 'percentage' || dType === 'percent') {
            externalDiscountAmount = Math.round(amount * (dValue / 100));
          } else {
            // Split fixed discount among students in the same discount group
            externalDiscountAmount = Math.min(
              Math.round(dValue / studentIdsCount),
              amount
            );
          }
          amount = Math.max(0, amount - externalDiscountAmount);
        }

        if (amount <= 0 && (student.basePrice || 0) <= 0) continue;

        const invoice = new Invoice({
          studentId: student._id,
          groupId: student.groupId,
          month: targetMonth,
          year: targetYear,
          amount,
          paidAmount: 0,
          status: 'pending',
          centerId: auth!.centerId || null,
        });

        await invoice.save();
        results.generated++;
        if ((student.discountAmount || 0) > 0 || (student.extraDiscount || 0) > 0 || externalDiscountAmount > 0) {
          results.withDiscounts++;
        }
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