import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Student, computeStudentFinalPrice } from '@/models/Student';
import { Group } from '@/models/Group';
import { User } from '@/models/User';
import { getAuthUser, isAdminRole } from '@/lib/auth-server';
import { ensureUniqueParentCode } from '@/lib/parentCode';

export const dynamic = 'force-dynamic';

function serializeStudent(s: Record<string, unknown>) {
  const effective = computeStudentFinalPrice(s as any);
  return {
    ...s,
    monthlyPrice: effective,
    finalPrice: effective,
  };
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const data = await request.json();
    const student = await Student.findById(params.id);

    if (!student) {
      return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
    }

    if (student.groupId && student.groupId.toString() !== data.groupId) {
      await Group.findByIdAndUpdate(student.groupId, {
        $pull: { studentIds: student._id },
      });
    }

    if (data.groupId && data.groupId !== student.groupId?.toString()) {
      await Group.findByIdAndUpdate(data.groupId, {
        $addToSet: { studentIds: student._id },
      });
    }

    student.name = data.name;
    const phoneList = Array.isArray(data.phones)
      ? data.phones.map((p: string) => String(p).trim()).filter(Boolean)
      : [];
    if (phoneList.length > 0) {
      student.phones = phoneList;
      student.phone = phoneList[0];
    } else if (data.phone !== undefined) {
      student.phone = String(data.phone);
      student.phones = student.phone ? [student.phone] : [];
    }
    if (data.arrivalDate !== undefined) {
      student.arrivalDate = data.arrivalDate ? new Date(data.arrivalDate) : undefined;
    }
    if (data.parentType !== undefined) student.parentType = data.parentType || '';
    if (data.debtReminderUntil !== undefined) {
      student.debtReminderUntil = data.debtReminderUntil ? new Date(data.debtReminderUntil) : undefined;
    }
    student.groupId = data.groupId || null;
    student.status = data.status;

    if (data.basePrice !== undefined) student.basePrice = Number(data.basePrice);
    else if (data.monthlyPrice !== undefined) student.basePrice = Number(data.monthlyPrice);

    if (data.discountAmount !== undefined) student.discountAmount = Number(data.discountAmount);
    if (data.discountEndDate !== undefined) {
      student.discountEndDate = data.discountEndDate ? new Date(data.discountEndDate) : undefined;
    }
    if (data.paymentStartDate) student.paymentStartDate = new Date(data.paymentStartDate);
    if (data.paymentCycle) student.paymentCycle = data.paymentCycle;
    if (data.customPaymentDays) student.customPaymentDays = data.customPaymentDays;
    if (data.nextPaymentDate) student.nextPaymentDate = new Date(data.nextPaymentDate);
    if (data.parentPhone !== undefined) student.parentPhone = data.parentPhone;
    if (data.parentName !== undefined) student.parentName = data.parentName;
    if (data.notificationEnabled !== undefined) student.notificationEnabled = data.notificationEnabled;
    if (data.parentTelegramChatId !== undefined) student.parentTelegramChatId = String(data.parentTelegramChatId);
    if (data.faceDescriptor !== undefined) student.faceDescriptor = data.faceDescriptor;
    if (data.avatarUrl !== undefined) student.avatarUrl = data.avatarUrl;

    if (data.regenerateParentCode) {
      student.parentAccessCode = await ensureUniqueParentCode();
    }

    if (data.parentUserId !== undefined && data.parentUserId !== null) {
      const pu = await User.findById(data.parentUserId);
      if (!pu || pu.role !== 'parent') {
        return NextResponse.json({ error: 'Noto‘g‘ri ota-ona akkaunti' }, { status: 400 });
      }
      student.parentUserId = pu._id as any;
      await User.updateOne({ _id: pu._id }, { $addToSet: { linkedStudentIds: student._id } });
    }

    if (data.scoreRecords !== undefined) {
      if (!Array.isArray(data.scoreRecords)) {
        return NextResponse.json({ error: 'scoreRecords massiv bo‘lishi kerak' }, { status: 400 });
      }
      student.scoreRecords = data.scoreRecords.map((r: Record<string, unknown>) => ({
        title: String(r.title ?? ''),
        value: Number(r.value ?? 0),
        maxValue: Number(r.maxValue ?? 100),
        recordedAt: r.recordedAt ? new Date(String(r.recordedAt)) : new Date(),
      })) as typeof student.scoreRecords;
    }

    await student.save();

    return NextResponse.json(
      serializeStudent(student.toObject() as unknown as Record<string, unknown>)
    );
  } catch (error) {
    return NextResponse.json({ error: 'Tahrirlashda xato' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthUser(request);
    if (!auth || !isAdminRole(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const student = await Student.findById(params.id);
    if (!student) {
      return NextResponse.json({ error: "O'quvchi topilmadi" }, { status: 404 });
    }

    if (student.groupId) {
      await Group.findByIdAndUpdate(student.groupId, {
        $pull: { studentIds: student._id },
      });
    }

    if (student.studentUserId) {
      await User.findByIdAndDelete(student.studentUserId);
    }
    await User.updateMany({ linkedStudentIds: student._id }, { $pull: { linkedStudentIds: student._id } });

    await Student.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "O'chirishda xato" }, { status: 500 });
  }
}
