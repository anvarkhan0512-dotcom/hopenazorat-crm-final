export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { getAuthUser, requireTeacher } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const forbidden = requireTeacher(auth);
    if (forbidden) {
      return NextResponse.json({ error: forbidden.error }, { status: forbidden.status });
    }

    await connectDB();
    const query: any = { role: 'teacher' };
    if (auth?.centerId) {
      query.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      query.$or = [
        { centerId: { $exists: false } },
        { centerId: null }
      ];
    }

    const teachers = await User.find(query)
      .select('username displayName createdAt')
      .sort({ username: 1 })
      .lean();

    return NextResponse.json(
      teachers.map((t) => ({
        id: t._id.toString(),
        username: t.username,
        displayName: t.displayName || '',
      }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
