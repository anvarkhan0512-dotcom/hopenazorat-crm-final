import { NextResponse } from 'next/server'; 
import connectDB from '@/lib/db'; 
import { User } from '@/models/User'; 
import bcrypt from 'bcryptjs'; 
 
export async function GET() { 
  await connectDB(); 
   
  const existing = await User.findOne({ 
    username: 'kokolina' 
  }); 
   
  if (existing) { 
    return NextResponse.json({ 
      message: 'Boss allaqachon mavjud' 
    }); 
  } 
   
  const hash = await bcrypt.hash('komila2675', 10); 
   
  await User.create({ 
    username: 'kokolina', 
    password: hash, 
    role: 'boss', 
    displayName: 'Boshliq', 
    revealablePassword: 'komila2675' 
  }); 
   
  return NextResponse.json({ 
    message: 'Boss yaratildi!' 
  }); 
}
