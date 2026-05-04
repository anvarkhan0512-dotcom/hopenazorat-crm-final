import { NextRequest, NextResponse } from 'next/server';
import { askGemini } from '@/lib/gemini';
import { askGroq } from '@/lib/groq';
import { getAuthUser } from '@/lib/auth-server';
import connectDB from '@/lib/db';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Sen "Hope Study" o'quv markazi  
CRM tizimining AI yordamchisisisan. 

IMKONIYATLARING: 
- Talabalar ro'yxatini ko'rsatish 
- Guruhlar haqida ma'lumot berish   
- To'lovlar statistikasini ko'rsatish 
- Yangi talaba/guruh qo'shishga yordam berish 
- Davomat va hisobotlar haqida gapirish 

QOIDALAR: 
- Faqat o'zbek tilida gapir 
- Hech qachon pul yoki narx so'rama 
- Qisqa va aniq javob ber 
- Ma'lumot so'ralsa, tizimdan olib ko'rsat 
- Buyruq berilsa, bajarishga harakat qil 

Sen admin, ustoz, talaba va ota-onalarga  
yordam beruvchi aqlli yordamchisan!`;

const detectIntent = (message: string) => { 
  const msg = message.toLowerCase(); 
  if (msg.includes('talabalar') &&  
     (msg.includes('ro\'yxat') || msg.includes('soni') ||  
      msg.includes('hammasi') || msg.includes('ko\'rsat')))  
    return 'GET_STUDENTS'; 
  if (msg.includes('guruhlar') &&  
     (msg.includes('ro\'yxat') || msg.includes('ko\'rsat'))) 
    return 'GET_GROUPS'; 
  if (msg.includes('to\'lovlar') || msg.includes('qarzdorlar')) 
    return 'GET_PAYMENTS'; 
  if (msg.includes('talaba qo\'sh') ||  
      msg.includes('yangi talaba')) 
    return 'ADD_STUDENT'; 
  if (msg.includes('guruh qo\'sh') ||  
      msg.includes('yangi guruh')) 
    return 'ADD_GROUP'; 
  if (msg.includes('statistika') ||  
      msg.includes('hisobot') ||  
      msg.includes('dashboard')) 
    return 'GET_STATS'; 
  return null; 
};

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

    const intent = detectIntent(message); 
    let contextData = ''; 
    const baseUrl = process.env.NEXTAUTH_URL || 'https://hopestudy.vercel.app';
     
    // Real data from database 
    if (intent === 'GET_STUDENTS') { 
      try { 
        const res = await fetch(`${baseUrl}/api/students`); 
        const students = await res.json(); 
        contextData = `Tizimda ${students.length} ta talaba bor.  
        Ro'yxat: ${students.slice(0, 10).map((s: any) =>  
          `${s.name} (${s.phone})`).join(', ')} 
        ${students.length > 10 ?  
          `va yana ${students.length - 10} ta...` : ''}`; 
      } catch (e) { 
        contextData = 'Talabalar ma\'lumotini olishda xatolik'; 
      } 
    } 
     
    if (intent === 'GET_GROUPS') { 
      try { 
        const res = await fetch(`${baseUrl}/api/groups`); 
        const groups = await res.json(); 
        contextData = `Tizimda ${groups.length} ta guruh bor:  
        ${groups.map((g: any) =>  
          `${g.name} (o'qituvchi: ${g.teacher})`).join(', ')}`; 
      } catch (e) { 
        contextData = 'Guruhlar ma\'lumotini olishda xatolik'; 
      } 
    } 
     
    if (intent === 'GET_PAYMENTS') { 
      try { 
        const res = await fetch(`${baseUrl}/api/payments`); 
        const payments = await res.json(); 
        const total = payments.reduce((sum: number, p: any) =>  
          sum + (p.amount || 0), 0); 
        contextData = `Jami ${payments.length} ta to'lov.  
        Umumiy summa: ${total.toLocaleString()} so'm`; 
      } catch (e) { 
        contextData = 'To\'lovlar ma\'lumotini olishda xatolik'; 
      } 
    } 
     
    if (intent === 'ADD_STUDENT') { 
      return NextResponse.json({ 
        reply: `Yangi talaba qo'shish uchun  
        quyidagi ma'lumotlarni yuboring: 
         
        📝 Ism va familiya: 
        📞 Telefon raqam: 
        👥 Guruh nomi: 
        💰 Oylik to'lov (so'mda): 
         
        Yuqoridagi formatda yozing, men tizimga  
        o'zim kiritaman!`, 
        action: 'COLLECT_STUDENT_INFO' 
      }); 
    } 
     
    if (intent === 'ADD_GROUP') { 
      return NextResponse.json({ 
        reply: `Yangi guruh qo'shish uchun: 
         
        📚 Guruh nomi: 
        👨‍🏫 O'qituvchi: 
        🕐 Dars vaqti: 
        💰 Oylik to'lov: 
         
        Formatda yozing, kiritaman!`, 
        action: 'COLLECT_GROUP_INFO' 
      }); 
    }

    // Conversation state for adding student
    const addStudentPattern = /ism[:\s]+(.+)\n.*telefon[:\s]+(.+)\n.*guruh[:\s]+(.+)\n.*to'lov[:\s]+([\d\s]+)/i; 
    const match = message.match(addStudentPattern); 
     
    if (match) { 
      try { 
        const res = await fetch(`${baseUrl}/api/students`, { 
          method: 'POST', 
          headers: {'Content-Type': 'application/json'}, 
          body: JSON.stringify({ 
            name: match[1].trim(), 
            phone: match[2].trim(), 
            group: match[3].trim(), 
            monthlyFee: parseInt(match[4].replace(/\s/g, '')) 
          }) 
        });
        
        if (res.ok) {
          return NextResponse.json({ 
            reply: `✅ ${match[1]} tizimga muvaffaqiyatli  
            qo'shildi! Talabalar bo'limida ko'rishingiz mumkin.` 
          });
        } else {
          throw new Error('Failed to add student');
        }
      } catch (e) { 
        return NextResponse.json({ 
          reply: '❌ Talabani qo\'shishda xatolik yuz berdi' 
        }); 
      } 
    }

    // Add context to AI prompt 
    const fullMessage = contextData  
      ? `${contextData}\n\nFoydalanuvchi savoli: ${message}` 
      : message;

    const messages = [
      ...history.map((h: any) => ({
        role: h.role,
        content: h.content
      })),
      { role: 'user', content: fullMessage }
    ];

    const imageContents = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString('base64');
        imageContents.push({
          inlineData: { data: base64, mimeType: file.type }
        });
      }
    }

    let reply = "";
    if (imageContents.length === 0) {
      try {
        reply = await askGroq(messages);
      } catch (groqError) {
        console.error('Groq failed, fallback to Gemini:', groqError);
        const aiRes = await askGemini(messages, { systemInstruction: SYSTEM_PROMPT });
        reply = aiRes.text;
      }
    } else {
      const aiRes = await askGemini(messages, { 
        systemInstruction: SYSTEM_PROMPT,
        inlineData: imageContents
      });
      reply = aiRes.text;
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({ error: 'Serverda xatolik yuz berdi' }, { status: 500 });
  }
}
