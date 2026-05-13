import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { NotificationLog } from '@/models/NotificationLog';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    const query: any = type ? { type } : {};
    if (auth?.centerId) {
      query.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      query.$or = [
        { centerId: { $exists: false } },
        { centerId: null }
      ];
    }
    
    const logs = await NotificationLog.find(query).sort({ createdAt: -1 }).limit(100);
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
