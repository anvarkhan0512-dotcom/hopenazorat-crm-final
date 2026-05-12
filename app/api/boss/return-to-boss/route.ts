import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import { User } from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'edu-crm-secret-key-2024';

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const bossId = auth.bossId;
  if (!bossId) {
    return NextResponse.json({ error: 'Not impersonating' }, { status: 400 });
  }
  
  await connectDB();
  const boss = await User.findById(bossId).lean() as any;
  if (!boss) {
    return NextResponse.json({ error: 'Boss not found' }, { status: 404 });
  }
  
  const token = jwt.sign(
    {
      id: boss._id.toString(),
      username: boss.username,
      role: boss.role,
      centerId: boss.centerId,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  const response = NextResponse.json({ success: true });
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 604800,
    path: '/',
  });
  
  return response;
}
