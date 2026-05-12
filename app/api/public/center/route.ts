import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Center } from '@/models/Center';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await connectDB();
    const center = await Center.findById(id).select('name settings').lean();
    
    if (!center) return NextResponse.json({ error: 'Center not found' }, { status: 404 });

    return NextResponse.json({ center });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
