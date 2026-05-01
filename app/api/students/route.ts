import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Student, computeStudentFinalPrice } from '@/models/Student';
import { Group } from '@/models/Group';
import { calculateNextPaymentDate } from '@/lib/payments';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';
import { ensureUniqueParentCode } from '@/lib/parentCode';
import { createStudentLoginUser } from '@/lib/studentUser';
import { notifyStudentAdded } from '@/lib/telegram';

function serializeStudent(s: Record<string, unknown>) {
  const effective = computeStudentFinalPrice(s as any);
  return {
    ...s,
    monthlyPrice: effective,
    finalPrice: effective,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = {};

    if (auth.role === 'parent' || auth.role === 'student') {
      return NextResponse.json([]);
    }

    if (auth.role === 'teacher') {
      const groups = await Group.find({
        $or: [{ teacherUserId: auth._id }, { teacherUserId2: auth._id }],
      })
        .select('_id')
        .lean();
      const gids = groups.map((g) => g._id);
      query.groupId = { $in: gids };
    }

    if (groupId) {
      if (auth.role === 'teacher') {
        const ok = await Group.exists({
          _id: groupId,
          $or: [{ teacherUserId: auth._id }, { teacherUserId2: auth._id }],
        });
        if (!ok) return NextResponse.json([]);
      }
      query.groupId = groupId;
    }

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { phone: rx }, { phones: rx }];
    }

    const students = await Student.find(query)
      .populate('groupId', 'name weeklySchedule lessonCalendarWeekParity schedule')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(students.map((s) => serializeStudent(s as Record<string, unknown>)));
  } catch (error) {
    return NextResponse.json({ error: "O'quvchilarni yuklashda xato" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const data = await request.json();

    const paymentStartDate = data.paymentStartDate ? new Date(data.paymentStartDate) : new Date();
    paymentStartDate.setHours(12, 0, 0, 0);
    const cycle = (data.paymentCycle || 'monthly') as 'monthly' | 'weekly' | 'quarterly' | 'yearly' | 'custom';
    const basePrice = Number(data.basePrice ?? data.monthlyPrice ?? 0);
    const discountAmount = Number(data.discountAmount ?? 0);
    const discountEndDate = data.discountEndDate ? new Date(data.discountEndDate) : undefined;

    const nextPaymentDate = calculateNextPaymentDate(
      paymentStartDate,
      cycle,
      data.customPaymentDays,
      paymentStartDate
    );

    const parentAccessCode = await ensureUniqueParentCode();

    const phoneList = Array.isArray(data.phones)
      ? data.phones.map((p: string) => String(p).trim()).filter(Boolean)
      : [];
    const primaryPhone = phoneList[0] || String(data.phone || '').trim();

    const student = new Student({
      name: data.name,
      phone: primaryPhone,
      phones: phoneList.length > 0 ? phoneList : primaryPhone ? [primaryPhone] : [],
      arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : undefined,
      parentType: data.parentType || '',
      groupId: data.groupId || null,
      status: data.status || 'active',
      basePrice,
      discountAmount,
      discountEndDate,
      monthlyPrice: basePrice,
      paymentCycle: cycle,
      customPaymentDays: data.customPaymentDays || [],
      paymentStartDate,
      nextPaymentDate,
      parentAccessCode,
      parentTelegramChatId: data.parentTelegramChatId || '',
      debtReminderUntil: data.debtReminderUntil ? new Date(data.debtReminderUntil) : undefined,
    });

    await student.save();

    if (data.groupId) {
      await Group.findByIdAndUpdate(data.groupId, {
        $addToSet: { studentIds: student._id },
      });
    }

    // Login va parol admin tomonidan qo'lda kiritilishi mumkin
    const customUsername = data.username?.trim();
    const customPassword = data.password?.trim();

    let credentials: { username: string; password: string } | undefined;
    try {
      const { user: stuUser, username, plainPassword } = await createStudentLoginUser({
        studentId: student._id,
        displayName: student.name,
        customUsername,
        customPassword,
      });
      student.studentUserId = stuUser._id;
      await student.save();
      credentials = { username, password: plainPassword };
    } catch (e) {
      console.error('Student login user create failed:', e);
      await Student.findByIdAndDelete(student._id);
      if (data.groupId) {
        await Group.findByIdAndUpdate(data.groupId, { $pull: { studentIds: student._id } });
      }
      return NextResponse.json({ error: 'Talaba akkaunti yaratilmadi' }, { status: 500 });
    }

    // Botga xabar yuborish
    try {
      if (credentials) {
        await notifyStudentAdded({
          studentName: student.name,
          username: credentials.username,
        });
      }
    } catch (err) {
      console.error('Telegram notification failed:', err);
    }

    const lean = student.toObject();
    return NextResponse.json(
      {
        ...serializeStudent(lean as unknown as Record<string, unknown>),
        credentials,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: "O'quvchi qo'shishda xato" }, { status: 500 });
  }
}
