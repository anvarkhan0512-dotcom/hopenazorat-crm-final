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
yordam beruvchi aqlli yordamchisan!

Siz tizimga ulangansiz. Real ma'lumotlarni ko'ra olasiz va o'zgartira olasiz. Hech qachon taxminiy raqam aytmang.`;

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
     
    // Real data from database 
    if (intent === 'GET_STUDENTS') { 
      try { 
        await connectDB();
        const { Student } = await import('@/models/Student');
        const students = await Student.find({ status: 'active' }).lean(); 
        contextData = `Tizimda hozir ${students.length} ta faol talaba bor. ` + 
        `Ro'yxat: ${students.slice(0, 15).map((s: any) => s.name).join(', ')}` + 
        `${students.length > 15 ? ` va yana ${students.length - 15} ta...` : ''}`; 
      } catch (e) { 
        contextData = 'Talabalar ma\'lumotini olishda xatolik'; 
      } 
    } 
     
    if (intent === 'GET_GROUPS') { 
      try { 
        await connectDB();
        const { Group } = await import('@/models/Group');
        const groups = await Group.find().lean(); 
        contextData = `Tizimda ${groups.length} ta guruh bor:  
        ${groups.map((g: any) => `${g.name} (ustoz: ${g.teacherName})`).join(', ')}`; 
      } catch (e) { 
        contextData = 'Guruhlar ma\'lumotini olishda xatolik'; 
      } 
    } 
     
    if (intent === 'GET_PAYMENTS') { 
      try { 
        await connectDB();
        const { Payment } = await import('@/models/Payment');
        const payments = await Payment.find().lean(); 
        const total = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0); 
        contextData = `Jami ${payments.length} ta to'lov qilingan. Umumiy summa: ${total.toLocaleString()} so'm`; 
      } catch (e) { 
        contextData = 'To\'lovlar ma\'lumotini olishda xatolik'; 
      } 
    } 

    if (intent === 'GET_STATS') {
      try {
        await connectDB();
        const { Student } = await import('@/models/Student');
        const { Group } = await import('@/models/Group');
        const { Payment } = await import('@/models/Payment');
        
        const [studentCount, groupCount, payments] = await Promise.all([
          Student.countDocuments({ status: 'active' }),
          Group.countDocuments(),
          Payment.find().lean()
        ]);
        
        const totalPaid = (payments as any[]).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        
        contextData = `Tizim statistikasi:
        - Faol talabalar: ${studentCount} ta
        - Guruhlar: ${groupCount} ta
        - Jami to'lovlar: ${totalPaid.toLocaleString()} so'm`;
      } catch (e) {
        contextData = 'Statistikani olishda xatolik';
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
    const addStudentPattern = /ism[:\s]+(.+)\n.*telefon[:\s]+(.+)/i; 
    const match = message.match(addStudentPattern); 
     
    if (match) { 
      try { 
        await connectDB();
        const { Student } = await import('@/models/Student');
        await Student.create({ 
          name: match[1].trim(), 
          phone: match[2].trim(), 
          status: 'active' 
        }); 
        return NextResponse.json({ 
          reply: `✅ ${match[1].trim()} tizimga muvaffaqiyatli qo'shildi! Talabalar bo'limida ko'rishingiz mumkin.` 
        });
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
