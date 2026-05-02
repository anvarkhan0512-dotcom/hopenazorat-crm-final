import { NextRequest, NextResponse } from 'next/server';
import { askGemini } from '@/lib/gemini';
import { askGroq } from '@/lib/groq';
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

    const formData = await request.formData();
    const message = formData.get('message') as string;
    const historyJson = formData.get('history') as string;
    const history = historyJson ? JSON.parse(historyJson) : [];
    const files = formData.getAll('files') as File[];
    const userRole = auth.role || 'student';

    const systemPrompts = {
      admin: `Siz Hope Study CRM administratori uchun AI yordamchisisiz. 
        Rasmlarni tahlil qiling, to'lov chekini tasdiqlang, 
        hisobotlar yarating. O'zbek tilida javob bering.`,
      teacher: `Siz Hope Study o'quv markazi o'qituvchisi uchun AI yordamchisisiz. 
        Doskadagi rasmlarni o'qing, vazifalarni tekshiring, 
        dars materiallarini tahlil qiling. O'zbek tilida javob bering.`,
      student: `Siz Hope Study o'quv markazi talabasi uchun AI yordamchisisiz. 
        Vazifalarni tushuntiring, savollarga javob bering, 
        o'quv materiallarini tahlil qiling. O'zbek tilida javob bering.`,
      parent: `Siz Hope Study o'quv markazi ota-onasi uchun AI yordamchisisiz. 
        To'lov chekini tasdiqlang, farzand natijalarini tushuntiring. 
        O'zbek tilida javob bering.`
    };

    const activeSystemPrompt = (systemPrompts as any)[userRole] || systemPrompts.student;

    const messages = [
      ...history.map((h: any) => ({
        role: h.role,
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    const imageContents = [];
    const documentFiles = [];
    
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      
      if (file.type.startsWith('image/')) {
        imageContents.push({
          inlineData: { data: base64, mimeType: file.type }
        });
      } else {
        documentFiles.push({
          name: file.name,
          type: file.type,
          size: file.size
        });
      }
    }

    let reply = "";
    const hasMedia = imageContents.length > 0;

    if (!hasMedia) {
      try {
        console.log('Attempting request with Groq');
        reply = await askGroq(messages);
      } catch (groqError) {
        console.error('Groq failed, fallback to Gemini:', groqError);
        const aiRes = await askGemini(messages, { systemInstruction: activeSystemPrompt });
        reply = aiRes.text;
      }
    } else {
      console.log('Using Gemini for multi-modal request');
      const aiRes = await askGemini(messages, { 
        systemInstruction: activeSystemPrompt,
        inlineData: imageContents
      });
      reply = aiRes.text;

      // Payment receipt detection for parents/students
      if (userRole === 'parent' || userRole === 'student') {
        const isReceipt = reply.toLowerCase().includes('to\'lov') || reply.toLowerCase().includes('chek');
        if (isReceipt) {
          // Save notification logic would go here
          console.log('Payment receipt detected, notifying admin...');
        }
      }
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({ error: 'Serverda xatolik yuz berdi' }, { status: 500 });
  }
}
