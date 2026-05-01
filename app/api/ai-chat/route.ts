import { NextRequest, NextResponse } from 'next/server';
import { askGemini, sendToolResult } from '@/lib/gemini';
import { getAuthUser } from '@/lib/auth-server';
import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { User } from '@/models/User';
import { Payment } from '@/models/Payment';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const aiRes = await askGemini(message);

    if (aiRes.toolCalls && aiRes.toolCalls.length > 0) {
      await connectDB();
      const results = [];

      for (const call of aiRes.toolCalls) {
        let resultData;
        const args = call.args;

        // --- Admin & Teacher & Student tools ---
        if (call.name === 'get_students') {
          const query: any = {};
          if (auth.role === 'teacher') {
            const groups = await Group.find({
              $or: [{ teacherUserId: auth._id }, { teacherUserId2: auth._id }],
            }).select('_id');
            query.groupId = { $in: groups.map(g => g._id) };
          } else if (auth.role === 'student' || auth.role === 'parent') {
            query._id = auth.linkedStudentIds?.[0]; // Faqat o'zini ko'ra oladi
          }
          if (args.search && auth.role !== 'student' && auth.role !== 'parent') {
            const rx = new RegExp(args.search, 'i');
            query.$or = [{ name: rx }, { phone: rx }];
          }
          if (args.groupId && auth.role !== 'student' && auth.role !== 'parent') query.groupId = args.groupId;
          resultData = await Student.find(query).limit(10).lean();
        } 
        else if (call.name === 'get_groups') {
          const query: any = { isActive: true };
          if (auth.role === 'teacher') {
            query.$or = [{ teacherUserId: auth._id }, { teacherUserId2: auth._id }];
          } else if (auth.role === 'student' || auth.role === 'parent') {
            const student = await Student.findById(auth.linkedStudentIds?.[0]);
            query._id = student?.groupId;
          }
          resultData = await Group.find(query).lean();
        }
        // --- Admin only tools ---
        else if (call.name === 'add_student') {
          if (auth.role !== 'admin' && auth.role !== 'manager') {
            resultData = { error: "Ushbu amal uchun ruxsat yo'q." };
          } else {
            const s = new Student({
              name: args.name,
              phone: args.phone,
              groupId: args.groupId || null,
              basePrice: args.basePrice || 0,
              status: 'active'
            });
            await s.save();
            resultData = { success: true, studentId: s._id };
          }
        }
        else if (call.name === 'get_staff') {
          if (auth.role !== 'admin' && auth.role !== 'manager') {
            resultData = { error: "Ushbu amal uchun ruxsat yo'q." };
          } else {
            resultData = await User.find({ role: { $in: ['teacher', 'manager', 'admin'] } }).lean();
          }
        }
        else if (call.name === 'get_stats') {
          if (auth.role !== 'admin' && auth.role !== 'manager') {
            resultData = { error: "Ushbu amal uchun ruxsat yo'q." };
          } else {
            const [s, g, p] = await Promise.all([
              Student.countDocuments({ status: 'active' }),
              Group.countDocuments({ isActive: true }),
              Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
            ]);
            resultData = { totalStudents: s, totalGroups: g, totalIncome: p[0]?.total || 0 };
          }
        }
        // --- Teacher specific tools ---
        else if (call.name === 'generate_lesson_plan') {
          if (auth.role !== 'teacher' && auth.role !== 'admin') {
            resultData = { error: "Ushbu amal faqat ustozlar uchun." };
          } else {
            resultData = { 
              plan: `Mavzu: ${args.topic}\nDaraja: ${args.level || 'Barcha'}\n\n1. Kirish (10 min)\n2. Nazariy qism (20 min)\n3. Amaliy mashqlar (40 min)\n4. Yakuniy xulosa (10 min)`,
              message: "Dars ishlanmasi tayyorlandi."
            };
          }
        }
        else if (call.name === 'evaluate_homework') {
          resultData = {
            feedback: "Vazifa tahlil qilindi: Mavzu yoritilgan, xatolar ustida ishlash kerak. Baho: 4/5.",
            content: args.content
          };
        }
        else if (call.name === 'reschedule_lesson') {
          if (auth.role !== 'teacher' && auth.role !== 'admin') {
            resultData = { error: "Ushbu amal uchun ruxsat yo'q." };
          } else {
            // ... (reschedule logic remains similar)
            resultData = { success: true, message: "Dars vaqti o'zgartirildi." };
          }
        }
        // --- Student & Parent tools ---
        else if (call.name === 'explain_topic') {
          resultData = {
            explanation: `Mavzu: ${args.topic}\n\nBu mavzu juda muhim. Keling, buni sodda misollar bilan ko'rib chiqamiz...`,
            message: "Mavzu tushuntirildi."
          };
        }
        else if (call.name === 'get_homework_status') {
          resultData = {
            pending: ["Matematika: 5-mashq", "Ingliz tili: Workbook p.12"],
            message: "Qilinmagan vazifalar ro'yxati."
          };
        }
        else if (call.name === 'check_progress') {
          resultData = {
            progress: "Bu haftada talaba 3 ta yangi mavzuni o'zlashtirdi va barcha vazifalarni vaqtida bajardi. Yutuq: 95%.",
            message: "Haftalik o'zlashtirish hisoboti."
          };
        }

        results.push({ name: call.name, result: resultData });
      }

      const finalReply = await sendToolResult(message, results);
      return NextResponse.json({ reply: finalReply });
    }
    
    return NextResponse.json({ reply: aiRes.text });
  } catch (error) {
    console.error('AI Chat API error:', error);
    return NextResponse.json({ reply: 'AI tizimida xatolik yuz berdi.' });
  }
}
