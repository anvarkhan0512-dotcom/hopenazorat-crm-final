import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser } from '@/lib/auth-server';
import { Notification } from '@/models/Notification';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const notifications = await Notification.find({ userId: auth.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId, title, message, type } = await request.json();
    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await connectDB();
    const notification = await Notification.create({
      userId,
      fromUserId: auth.id,
      title,
      message,
      type: type || 'info'
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) {
    console.error('Create notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { notificationId, all } = await request.json();
    await connectDB();

    if (all) {
      await Notification.updateMany(
        { userId: auth.id, isRead: false },
        { $set: { isRead: true } }
      );
    } else if (notificationId) {
      await Notification.updateOne(
        { _id: notificationId, userId: auth.id },
        { $set: { isRead: true } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
