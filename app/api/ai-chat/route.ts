import { NextRequest, NextResponse } from 'next/server';
import { askGemini } from '@/lib/gemini';
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

    console.log('Sending request to Gemini 1.5 Pro');
    const aiRes = await askGemini(messages);
    
    if (aiRes.toolCalls && aiRes.toolCalls.length > 0) {
      await connectDB();
      const toolResults = [];

      for (const call of aiRes.toolCalls) {
        const { name, args } = call;
        let result = { success: false, message: "Noma'lum funksiya" };

        try {
          if (name === 'archive_student') {
            const { id, reason } = args as any;
            const student = await Student.findByIdAndUpdate(id, { status: 'left' }, { new: true });
            result = { 
              success: !!student, 
              message: student ? `Talaba ${student.name} arxivga olindi. Sabab: ${reason}` : "Talaba topilmadi" 
            };
          } else if (name === 'get_attendance_stats') {
            const { groupId, date } = args as any;
            const query: any = {};
            if (groupId) query.groupId = groupId;
            if (date) query.date = new Date(date);
            
            const stats = await Attendance.aggregate([
              { $match: query },
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);
            result = { success: true, message: JSON.stringify(stats) };
          } else if (name === 'create_staff_password') {
            const { name: staffName } = args as any;
            const password = Math.random().toString(36).slice(-8);
            result = { success: true, message: `Xodim ${staffName} uchun yangi parol: ${password}` };
          } else if (name === 'get_students') {
            const { search, groupId } = args as any;
            const query: any = {};
            if (search) query.name = { $regex: search, $options: 'i' };
            if (groupId) query.groupId = groupId;
            const students = await Student.find(query).limit(10).lean();
            result = { success: true, message: JSON.stringify(students) };
          }
          // Boshqa funksiyalar ham shu tartibda qo'shilishi mumkin
        } catch (err: any) {
          result = { success: false, message: `Xatolik: ${err.message}` };
        }
        
        toolResults.push({ name, result });
      }

      // Gemini-ga natijalarni qaytarib, yakuniy javobni olish ham mumkin, 
      // lekin hozircha soddalik uchun to'g'ridan-to'g'ri natijani qaytaramiz
      const finalReply = toolResults.map(r => r.result.message).join('\n');
      return NextResponse.json({ reply: finalReply });
    }

    return NextResponse.json({ reply: aiRes.text || "AI hech qanday ma'lumot qaytarmadi." });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({ error: 'Serverda xatolik yuz berdi' }, { status: 500 });
  }
}
