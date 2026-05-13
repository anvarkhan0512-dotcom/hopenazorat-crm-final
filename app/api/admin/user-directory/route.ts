import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();
    const query: any = {};
    if (auth?.centerId) {
      query.centerId = new mongoose.Types.ObjectId(auth.centerId);
    } else {
      query.$or = [
        { centerId: { $exists: false } },
        { centerId: null }
      ];
    }

    const users = await User.find(query)
      .select('username role displayName revealablePassword createdAt')
      .sort({ role: 1, username: 1 })
      .lean();

    return NextResponse.json(
      users.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        role: u.role,
        displayName: u.displayName || '',
        hasRevealable: Boolean(u.revealablePassword && String(u.revealablePassword).length > 0),
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server' }, { status: 500 });
  }
}
