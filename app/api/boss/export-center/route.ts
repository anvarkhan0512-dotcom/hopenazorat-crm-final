import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import connectDB from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || auth.role !== 'boss') {
      return NextResponse.json(
        { error: 'Forbidden' }, { status: 403 });
    }
    
    const centerId = request.nextUrl.searchParams.get('centerId');
    
    await connectDB();
    
    const { Student } = await import('@/models/Student');
    const { Group } = await import('@/models/Group');
    const { Payment } = await import('@/models/Payment');
    const { User } = await import('@/models/User');
    const { Attendance } = await import('@/models/Attendance');
    const { Discount } = await import('@/models/Discount');
    
    const filter = centerId 
      ? { centerId } 
      : { $or: [ 
          { centerId: { $exists: false } }, 
          { centerId: null } 
        ]};
    
    const [students, groups, payments, users, attendance, discounts] = await Promise.all([
      Student.find(filter).lean(),
      Group.find(filter).lean(),
      Payment.find(filter).lean(),
      User.find({
        centerId: centerId || null,
        role: { $ne: 'boss' }
      }).lean(),
      Attendance.find(filter).lean(),
      Discount.find(filter).lean(),
    ]);
    
    const exportData = {
      exportDate: new Date().toISOString(),
      centerId: centerId || 'main',
      version: '1.0',
      data: {
        students,
        groups,
        payments,
        users: users.map((u: any) => ({
          ...u,
          password: undefined // don't export password hash
        })),
        attendance,
        discounts
      },
      stats: {
        students: students.length,
        groups: groups.length,
        payments: payments.length,
        users: users.length
      }
    };
    
    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="center-export-${Date.now()}.json"`
      }
    });
  } catch (error: any) {
    console.error('Export center error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
