import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import { User } from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'edu-crm-secret-key-2024';

export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth || auth.role !== 'boss') {
    return NextResponse.json(
      { error: 'Forbidden' }, { status: 403 });
  }
   
  const { targetUserId } = await request.json();
  await connectDB();
   
  const target = await User.findById(targetUserId).lean() as any;
  if (!target) return NextResponse.json(
    { error: 'User not found' }, { status: 404 });
   
  const token = jwt.sign(
    {
      id: target._id.toString(),
      username: target.username,
      role: target.role,
      centerId: target.centerId,
      isBossImpersonating: true,
      bossId: auth.id,
      displayName: target.displayName || target.username,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
   
  const redirectTo = target.role === 'teacher'
    ? '/teacher'
    : target.role === 'student'
    ? '/student'
    : target.role === 'parent'
    ? '/parent'
    : '/dashboard';
   
  const response = NextResponse.json({
    success: true,
    role: target.role,
    redirectTo,
  });
   
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7200,
    path: '/',
  });
   
  return response;
}
