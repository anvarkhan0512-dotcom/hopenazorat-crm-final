import { NextRequest, NextResponse } from 'next/server'; 
import { getAuthUser } from '@/lib/auth-server'; 
import connectDB from '@/lib/db'; 
import { User } from '@/models/User'; 
 
export async function POST(request: NextRequest) { 
  const auth = await getAuthUser(request); 
  if (!auth) return NextResponse.json( 
    { error: 'Unauthorized' }, { status: 401 }); 
  await connectDB(); 
  const code = Math.floor(100000 +  
    Math.random() * 900000).toString(); 
  await User.findByIdAndUpdate(auth.userId, { 
    telegramCode: code, 
    telegramCodeExpiry: new Date(Date.now() + 5*60*1000) 
  }); 
  return NextResponse.json({ code }); 
} 
