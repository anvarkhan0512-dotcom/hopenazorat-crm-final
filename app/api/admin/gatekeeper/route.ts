import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import { getAuthUser, requireAdmin } from '@/lib/auth-server';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    const denied = requireAdmin(auth);
    if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });

    const { adminPassword } = await request.json();
    
    // Gatekeeper: Anvar051203
    if (adminPassword === 'Anvar051203') {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'incorrectAdminPassword' }, { status: 403 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Server' }, { status: 500 });
  }
}
