import { NextRequest, NextResponse } from 'next/server'; 
import { getAuthUser, isAdminRole } from '@/lib/auth-server'; 
import connectDB from '@/lib/db'; 
import { User } from '@/models/User'; 
 
export async function GET(request: NextRequest) { 
  const auth = await getAuthUser(request); 
  if (!auth || !isAdminRole(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); 
  }

  await connectDB(); 
  const users = await User.find({
    $or: [
      { telegramChatId: { $ne: '' } },
      { telegramCode: { $ne: null } }
    ]
  }).select('displayName role telegramChatId telegramUsername updatedAt createdAt').lean();

  return NextResponse.json(users); 
} 
