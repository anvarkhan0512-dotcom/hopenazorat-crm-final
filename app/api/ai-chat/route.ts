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
        content: h.content,
        ...(h.tool_calls ? { tool_calls: h.tool_calls } : {}),
        ...(h.tool_call_id ? { tool_call_id: h.tool_call_id } : {})
      })),
      { role: 'user', content: message }
    ];
    const aiRes = await askTogether(messages);

    if (aiRes.tool_calls && aiRes.tool_calls.length > 0) {
      await connectDB();
      // Important: Convert tool_calls to the format OpenAI expects
      const assistantMessageWithTools = {
        role: 'assistant',
        content: aiRes.content || "",
        tool_calls: aiRes.tool_calls
      };
      
      const toolMessages = [...messages, assistantMessageWithTools];

      for (const toolCall of aiRes.tool_calls) {
        let resultData;
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const functionName = toolCall.function.name;

          if (functionName === 'archive_student') {
            if (auth.role !== 'admin' && auth.role !== 'manager') {
              resultData = { error: "Ushbu amal uchun ruxsat yo'q." };
            } else {
              const student = await Student.findByIdAndUpdate(args.id, { 
                status: 'left',
                archiveReason: args.reason 
              }, { new: true });
              resultData = student ? { success: true, name: student.name } : { error: "Talaba topilmadi" };
            }
          }
          else if (functionName === 'get_attendance_stats') {
            const query: any = {};
            if (args.groupId) query.groupId = args.groupId;
            if (args.date) query.date = new Date(args.date);
            
            const stats = await Attendance.aggregate([
              { $match: query },
              { $group: {
                  _id: "$status",
                  count: { $sum: 1 }
              }}
            ]);
            resultData = stats;
          }
          else if (functionName === 'create_staff_password') {
            if (auth.role !== 'admin' && auth.role !== 'manager') {
              resultData = { error: "Ushbu amal uchun ruxsat yo'q." };
            } else {
              const password = Math.random().toString(36).slice(-8);
              resultData = { name: args.name, password };
            }
          }
          else if (functionName === 'get_students') {
            const query: any = {};
            if (auth.role === 'teacher') {
              const groups = await Group.find({
                $or: [{ teacherUserId: auth._id }, { teacherUserId2: auth._id }],
              }).select('_id');
              query.groupId = { $in: groups.map(g => g._id) };
            }
            if (args.search) {
              const rx = new RegExp(args.search, 'i');
              query.$or = [{ name: rx }, { phone: rx }];
            }
            resultData = await Student.find(query).limit(5).lean();
          } else {
            resultData = { error: "Funksiya topilmadi" };
          }
        } catch (e) {
          console.error('Tool argument parsing error:', e);
          resultData = { error: "Argumentlarni o'qishda xatolik" };
        }

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(resultData),
        });
      }

      // Get final response after tool calls
      const finalRes = await askTogether(toolMessages);
      return NextResponse.json({ reply: finalRes.content || "AI javob qaytarishda xatolik yuz berdi." });
    }

    return NextResponse.json({ reply: aiRes.content || "AI hech qanday ma'lumot qaytarmadi." });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({ error: 'Serverda xatolik yuz berdi' }, { status: 500 });
  }
}
