import { askGemini, getSystemPrompt } from '@/lib/gemini';
import { askGroq, getGroqSystemPrompt } from '@/lib/groq';
import { getAuthUser } from '@/lib/auth-server';
import connectDB from '@/lib/db';

export const dynamic = 'force-dynamic';

// Role-based data fetcher 
async function getRoleContext( 
  userId: string, 
  role: string, 
  message: string,
  centerId?: string
): Promise<string> { 
  await connectDB(); 
  const msg = message.toLowerCase(); 
  
  const centerFilter = centerId ? { centerId } : { $or: [{ centerId: { $exists: false } }, { centerId: null }] };

  // ===== ADMIN ===== 
  if (role === 'admin' || role === 'manager') { 
    
    // Students info 
    if (msg.includes('talaba') || 
        msg.includes('o\'quvchi') || 
        msg.includes('nechta') || 
        msg.includes('ro\'yxat')) { 
      const { Student } = await import('@/models/Student'); 
      const students = await Student.find({ ...centerFilter, status: 'active' }) 
        .populate('groupId', 'name') 
        .select('name phone status monthlyPrice groupId') 
        .lean(); 
      return `Faol talabalar: ${students.length} ta.\n` + 
        students.slice(0,20).map((s: any) => 
          `- ${s.name} | ${s.phone || 'tel yo\'q'} | ` + 
          `Guruh: ${s.groupId?.name || 'belgilanmagan'} | ` + 
          `Oylik: ${(s.monthlyPrice || 0).toLocaleString()} so'm` 
        ).join('\n'); 
    } 
    
    // Groups info 
    if (msg.includes('guruh')) { 
      const { Group } = await import('@/models/Group'); 
      const groups = await Group.find(centerFilter) 
        .populate('teacherUserId', 'displayName') 
        .lean(); 
      return `Guruhlar: ${groups.length} ta.\n` + 
        groups.map((g: any) => 
          `- ${g.name} | ` + 
          `Ustoz: ${g.teacherUserId?.displayName || 'belgilanmagan'} | ` + 
          `Narx: ${(g.price || 0).toLocaleString()} so'm` 
        ).join('\n'); 
    } 
    
    // Payments info 
    if (msg.includes('to\'lov') || 
        msg.includes('daromad') || 
        msg.includes('pul')) { 
      const { Payment } = await import('@/models/Payment'); 
      const now = new Date(); 
      const startOfMonth = new Date( 
        now.getFullYear(), now.getMonth(), 1); 
      const payments = await Payment.find({ 
        ...centerFilter,
        createdAt: { $gte: startOfMonth } 
      }).lean(); 
      const total = payments.reduce( 
        (sum: number, p: any) => sum + (p.amount || 0), 0); 
      return `Bu oylik to'lovlar: ${payments.length} ta.\n` + 
        `Jami tushum: ${total.toLocaleString()} so'm`; 
    } 
    
    // Debtors 
    if (msg.includes('qarzdor') || 
        msg.includes('qarz')) { 
      const { Student } = await import('@/models/Student'); 
      const debtors = await Student.find({ 
        ...centerFilter,
        status: 'active', 
        lastPaymentDate: { 
          $lt: new Date(Date.now() - 30*24*60*60*1000) 
        } 
      }).select('name phone monthlyPrice').lean(); 
      return `Qarzdorlar: ${debtors.length} ta.\n` + 
        debtors.slice(0,15).map((s: any) => 
          `- ${s.name} | ${(s.monthlyPrice||0).toLocaleString()} so'm` 
        ).join('\n'); 
    } 
    
    // Staff 
    if (msg.includes('hodim') || 
        msg.includes('ustoz') || 
        msg.includes('o\'qituvchi')) { 
      const { User } = await import('@/models/User'); 
      const staff = await User.find({ 
        ...centerFilter,
        role: { $in: ['teacher', 'manager'] } 
      }).select('displayName role').lean(); 
      return `Xodimlar: ${staff.length} ta.\n` + 
        staff.map((s: any) => 
          `- ${s.displayName} (${s.role})` 
        ).join('\n'); 
    } 
    
    // General stats 
    const { Student } = await import('@/models/Student'); 
    const { Group } = await import('@/models/Group'); 
    const [sCount, gCount] = await Promise.all([ 
      Student.countDocuments({ ...centerFilter, status: 'active' }), 
      Group.countDocuments(centerFilter) 
    ]); 
    return `Tizim: ${sCount} faol talaba, ${gCount} guruh`; 
  } 
  
  // ===== TEACHER ===== 
  if (role === 'teacher') { 
    if (msg.includes('talaba') || 
        msg.includes('o\'quvchi')) { 
      const { Student } = await import('@/models/Student'); 
      const { Group } = await import('@/models/Group'); 
      const myGroups = await Group.find({ 
        ...centerFilter,
        teacherUserId: userId 
      }).lean(); 
      const groupIds = myGroups.map((g: any) => g._id); 
      const students = await Student.find({ 
        ...centerFilter,
        groupId: { $in: groupIds }, 
        status: 'active' 
      }).populate('groupId', 'name').lean(); 
      return `Sizning talabalaringiz: ${students.length} ta\n` + 
        students.map((s: any) => 
          `- ${s.name} | ${s.groupId?.name}` 
        ).join('\n'); 
    } 
    
    if (msg.includes('guruh') || 
        msg.includes('dars')) { 
      const { Group } = await import('@/models/Group'); 
      const groups = await Group.find({ 
        ...centerFilter,
        teacherUserId: userId 
      }).lean(); 
      return `Sizning guruhlaringiz: ${groups.length} ta\n` + 
        groups.map((g: any) => 
          `- ${g.name} | Vaqt: ${g.schedule || 'belgilanmagan'}` 
        ).join('\n'); 
    } 
    
    return `Salom! Men sizning guruhlaringiz va 
    talabalaringiz haqida yordam bera olaman.`; 
  } 
  
  // ===== STUDENT ===== 
  if (role === 'student') { 
    const { User } = await import('@/models/User'); 
    const user = await User.findOne({ _id: userId, ...centerFilter }).lean() as any; 
    
    const { Student } = await import('@/models/Student'); 
    const student = await Student.findOne({ 
      ...centerFilter,
      $or: [ 
        { studentUserId: userId }, 
        { phone: user?.username } 
      ] 
    }).populate('groupId').lean() as any; 
    
    if (!student) return 'Talaba ma\'lumoti topilmadi'; 
    
    if (msg.includes('to\'lov') || 
        msg.includes('qarz')) { 
      const { Payment } = await import('@/models/Payment'); 
      const payments = await Payment.find({ 
        ...centerFilter,
        studentId: student._id 
      }).sort({ createdAt: -1 }).limit(5).lean(); 
      return `Sizning to'lovlaringiz:\n` + 
        payments.map((p: any) => 
          `- ${new Date(p.createdAt).toLocaleDateString('uz')} | ` + 
          `${(p.amount||0).toLocaleString()} so'm` 
        ).join('\n') + 
        `\nOylik to'lov: ${(student.monthlyPrice||0).toLocaleString()} so'm`; 
    } 
    
    if (msg.includes('guruh') || 
        msg.includes('dars')) { 
      return `Sizning guruhingiz: ${student.groupId?.name || 'belgilanmagan'}\n` + 
        `Jadval: ${student.groupId?.schedule || 'belgilanmagan'}\n` + 
        `Oylik to'lov: ${(student.monthlyPrice||0).toLocaleString()} so'm`; 
    } 
  } 
  
  // ===== PARENT ===== 
  if (role === 'parent') { 
    const { Student } = await import('@/models/Student'); 
    const children = await Student.find({ 
      ...centerFilter,
      parentUserId: userId 
    }).populate('groupId').lean(); 
    
    if (children.length === 0) return 'Farzand ma\'lumoti topilmadi'; 
    
    if (msg.includes('to\'lov') || 
        msg.includes('qarz')) { 
      const { Payment } = await import('@/models/Payment'); 
      let result = ''; 
      for (const child of children) { 
        const payments = await Payment.find({ 
          ...centerFilter,
          studentId: child._id 
        }).sort({ createdAt: -1 }).limit(3).lean(); 
        result += `\n${(child as any).name}:\n` + 
          payments.map((p: any) => 
            `  - ${new Date(p.createdAt).toLocaleDateString('uz')}: ` + 
            `${(p.amount||0).toLocaleString()} so'm` 
          ).join('\n'); 
      } 
      return `Farzandlaringizning to'lovlari:${result}`; 
    } 
    
    return children.map((c: any) => 
      `${c.name} | Guruh: ${c.groupId?.name || 'belgilanmagan'} | ` + 
      `Oylik: ${(c.monthlyPrice||0).toLocaleString()} so'm` 
    ).join('\n'); 
  } 
  
  return ''; 
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = auth.id;
    const userRole = auth.role;
    const centerId = auth.centerId;
    const centerName = auth.centerName || 'O\'quv markaz';
    const SYSTEM_PROMPT = getSystemPrompt(centerName);
    const GROQ_SYSTEM_PROMPT = getGroqSystemPrompt(centerName);

    const formData = await request.formData();
    const message = (formData.get('message') as string) || '';
    const historyJson = (formData.get('history') as string) || '[]';
    const history = historyJson ? JSON.parse(historyJson) : [];
    const files = formData.getAll('files') as File[];

    const roleContext = await getRoleContext( 
      userId, 
      userRole, 
      message,
      centerId
    ); 
    
    const fullMessage = roleContext 
      ? `[TIZIM MA'LUMOTLARI]:\n${roleContext}\n\n` + 
        `[FOYDALANUVCHI SAVOLI]: ${message}` 
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
        reply = await askGroq(messages, GROQ_SYSTEM_PROMPT);
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
