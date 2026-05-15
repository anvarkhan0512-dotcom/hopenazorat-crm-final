import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';
import { sendSMS } from '@/lib/sms';
import connectDB from '@/lib/db';
import { SMSLog } from '@/models/SMSLog';

export const dynamic = 'force-dynamic';

// Basic in-memory rate limiting
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(centerId: string) {
  const now = Date.now();
  const limit = rateLimits.get(centerId);

  if (!limit || now > limit.resetTime) {
    rateLimits.set(centerId, { count: 1, resetTime: now + 60000 }); // 1 minute
    return true;
  }

  if (limit.count >= 10) {
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, message, centerId } = await request.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'To and message are required' }, { status: 400 });
    }

    const targetCenterId = centerId || auth.centerId;
    if (!targetCenterId && auth.role !== 'boss') {
      return NextResponse.json({ error: 'Center ID required' }, { status: 400 });
    }

    // Rate limiting for non-boss users
    if (auth.role !== 'boss' && targetCenterId) {
      if (!checkRateLimit(targetCenterId.toString())) {
        return NextResponse.json({ error: 'Rate limit exceeded (10 SMS per minute)' }, { status: 429 });
      }
    }

    const result = await sendSMS(to, message, targetCenterId);

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error('SMS API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const centerId = searchParams.get('centerId');

    const query: any = {};
    if (status) query.status = status;
    
    if (auth.role === 'boss') {
      if (centerId) query.centerId = centerId;
    } else {
      query.centerId = auth.centerId;
    }

    const logs = await SMSLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
