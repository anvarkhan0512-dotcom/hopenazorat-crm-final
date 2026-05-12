import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getAuthUser, requireBoss } from '@/lib/auth-server';
import { Center } from '@/models/Center';
import { User } from '@/models/User';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireBoss(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    await connectDB();
    const centers = await Center.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(centers);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireBoss(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { name, adminUsername, adminPassword, trialDays, logoText, primaryColor } = await request.json();

    if (!name || !adminUsername || !adminPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Check if adminUsername is taken
    const existingUser = await User.findOne({ username: adminUsername });
    if (existingUser) {
      return NextResponse.json({ error: 'Admin username already taken' }, { status: 400 });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + (parseInt(trialDays) || 7));

    const center = await Center.create({
      name,
      adminUsername,
      trialEndsAt,
      settings: {
        logoText: logoText || name,
        primaryColor: primaryColor || '#7c3aed',
      },
    });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.create({
      username: adminUsername,
      password: hashedPassword,
      role: 'admin',
      displayName: 'Admin',
      centerId: center._id,
      revealablePassword: adminPassword, // Per current CRM convention
    });

    return NextResponse.json({ success: true, center });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireBoss(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { centerId, isBlocked, trialEndsAt } = await request.json();
    await connectDB();

    const update: any = {};
    if (isBlocked !== undefined) update.isBlocked = isBlocked;
    if (trialEndsAt) update.trialEndsAt = new Date(trialEndsAt);

    const center = await Center.findByIdAndUpdate(centerId, update, { new: true });
    return NextResponse.json({ success: true, center });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
