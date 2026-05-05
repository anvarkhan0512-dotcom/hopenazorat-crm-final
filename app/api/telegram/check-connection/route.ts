import { NextRequest, NextResponse } from 'next/server'; 
import { getAuthUser } from '@/lib/auth-server'; 
import connectDB from '@/lib/db'; 
import { User } from '@/models/User'; 
 
export async function GET(request: NextRequest) { 
  const auth = await getAuthUser(request); 
  if (!auth) return NextResponse.json( 
    { error: 'Unauthorized' }, { status: 401 }); 
  const code = request.nextUrl.searchParams.get('code'); 
  await connectDB(); 
  const user = await User.findById(auth.userId); 
  if (user?.telegramChatId &&  
      user?.telegramCode === null) { 
    return NextResponse.json({  
      connected: true, 
      username: user.telegramUsername || '' 
    }); 
  } 
  return NextResponse.json({ connected: false }); 
} 
