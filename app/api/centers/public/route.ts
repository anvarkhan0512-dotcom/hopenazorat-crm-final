import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Center } from '@/models/Center';

export async function GET(request: Request) { 
  const id = new URL(request.url).searchParams.get('id'); 
  if (!id) return NextResponse.json({ error: 'ID talab qilinadi' }, { status: 400 });

  await connectDB(); 
  const center = await Center.findById(id) 
    .select('name settings isBlocked trialEndsAt') 
    .lean(); 
  
  if (!center) return NextResponse.json( 
    { error: 'Topilmadi' }, { status: 404 }); 
  
  return NextResponse.json(center); 
}
