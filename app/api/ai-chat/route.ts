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

    const SYSTEM_PROMPT = `Siz "Hope Study" o'quv markazi CRM tizimining 
AI yordamchisisiz. Quyidagi qoidalarga qat'iy rioya qiling: 

1. Siz Hope Study xodimisiz - hech qachon pul yoki haq so'ramang 
2. Faqat o'zbek tilida javob bering 
3. Faqat Hope Study CRM bilan bog'liq savollarga javob bering: 
   - Talabalar, guruhlar, to'lovlar, davomat haqida 
   - O'qituvchilar va admin uchun yordam 
   - Hisobotlar va statistika 
4. Har doim qisqa, aniq va do'stona javob bering 
5. So'm valyutasidan foydalaning 
6. Siz bu markazning bir qismisiz, xizmat ko'rsatasiz 

Hech qachon: pul so'ramang, freelancer kabi harakat qilmang, boshqa mavzularda gaplashmang.`;

    const activeSystemPrompt = SYSTEM_PROMPT;

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
