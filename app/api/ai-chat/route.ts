import { NextRequest, NextResponse } from 'next/server';
import { askTogether } from '@/lib/together';
import { getAuthUser } from '@/lib/auth-server';
import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { User } from '@/models/User';
import { Payment } from '@/models/Payment';
import { Attendance } from '@/models/Attendance';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history = [] } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const messages = [
      ...history.map((h: any) => ({
        role: h.role,
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Sending simple request to Together AI (No Tools)');
    const aiRes = await askTogether(messages);
    console.log('Together AI response received:', !!aiRes);

    return NextResponse.json({ reply: aiRes.content || "AI hech qanday ma'lumot qaytarmadi." });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({ error: 'Serverda xatolik yuz berdi' }, { status: 500 });
  }
}
