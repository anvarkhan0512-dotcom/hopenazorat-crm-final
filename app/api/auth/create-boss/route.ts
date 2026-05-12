import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    if (key !== 'kokolina_secret_2675') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const existing = await User.findOne({ username: 'kokolina' });
    if (existing) {
      return NextResponse.json({ message: 'Boss user already exists' });
    }

    const hashedPassword = await bcrypt.hash('komila2675', 10);
    const boss = await User.create({
      username: 'kokolina',
      password: hashedPassword,
      role: 'boss',
      displayName: 'Boshliq',
      linkedStudentIds: [],
    });

    return NextResponse.json({
      message: 'Boss user created successfully',
      id: boss._id.toString(),
      username: boss.username,
      role: boss.role,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
