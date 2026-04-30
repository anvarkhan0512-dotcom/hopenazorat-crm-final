import { Types } from 'mongoose';
import { Payment } from '@/models/Payment';
import { Student, computeStudentFinalPrice } from '@/models/Student';
import { Group } from '@/models/Group';
import { User } from '@/models/User';

export const DEFAULT_TEACHER_SHARE_PCT = 30;

function startEndOfMonth(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function splitTeacherAmount(
  amount: number,
  g: {
    teacherSharePercent?: number;
    teacherPayoutFixed?: number;
  }
): { teacherTotal: number; centerPart: number } {
  const fixed = Number(g.teacherPayoutFixed ?? 0);
  let teacherTotal =
    fixed > 0 ? Math.min(amount, fixed) : Math.round((amount * (g.teacherSharePercent ?? DEFAULT_TEACHER_SHARE_PCT)) / 100);
  if (teacherTotal > amount) teacherTotal = amount;
  return { teacherTotal, centerPart: amount - teacherTotal };
}

/**
 * To‘lovlar: guruh sozlamalari bo‘yicha ustoz / markaz ulushi.
 * Ikki ustoz bo‘lsa, ustoz ulushi teng ikkiga bo‘linadi.
 */
export async function getTeacherPaymentStats(teacherUserId: Types.ObjectId, month: number, year: number) {
  const { start, end } = startEndOfMonth(new Date(year, month - 1, 1));

  const groupDocs = await Group.find({
    isActive: true,
    $or: [{ teacherUserId }, { teacherUserId2: teacherUserId }],
  })
    .select('_id teacherUserId teacherUserId2 teacherSharePercent teacherPayoutFixed')
    .lean();

  const groupIds = groupDocs.map((g) => g._id);
  if (groupIds.length === 0) {
    return {
      totalPayments: 0,
      teacherShare: 0,
      centerShare: 0,
      byStudent: [] as {
        studentId: string;
        name: string;
        amount: number;
        teacherPart: number;
        centerPart: number;
      }[],
    };
  }

  const groupById = new Map(groupDocs.map((g) => [g._id.toString(), g]));

  const students = await Student.find({ groupId: { $in: groupIds }, status: 'active' })
    .select('_id name groupId')
    .lean();
  const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

  const payments = await Payment.find({
    createdAt: { $gte: start, $lte: end },
  }).lean();

  let totalGross = 0;
  let myTeacherShare = 0;
  const byStudent: Record<string, { name: string; amount: number; teacherPart: number; centerPart: number }> = {};

  const tid = teacherUserId.toString();

  for (const p of payments) {
    const sid = p.studentId.toString();
    const stu = studentMap.get(sid);
    if (!stu || !stu.groupId) continue;
    const g = groupById.get(stu.groupId.toString());
    if (!g) continue;

    const amt = p.amount || 0;
    const { teacherTotal } = splitTeacherAmount(amt, g);
    const t1 = g.teacherUserId?.toString();
    const t2 = g.teacherUserId2?.toString();
    let shareForThisTeacher = 0;
    if (t1 && t2 && (t1 === tid || t2 === tid)) {
      shareForThisTeacher = teacherTotal / 2;
    } else if (t1 === tid || t2 === tid) {
      shareForThisTeacher = teacherTotal;
    } else {
      continue;
    }

    totalGross += amt;
    myTeacherShare += shareForThisTeacher;
    if (!byStudent[sid]) {
      byStudent[sid] = { name: (stu as { name: string }).name, amount: 0, teacherPart: 0, centerPart: 0 };
    }
    byStudent[sid].amount += amt;
    byStudent[sid].teacherPart += Math.round(shareForThisTeacher);
  }

  const list = Object.entries(byStudent).map(([studentId, v]) => ({
    studentId,
    name: v.name,
    amount: v.amount,
    teacherPart: v.teacherPart,
    centerPart: v.amount - v.teacherPart,
  }));

  const teacherRounded = Math.round(myTeacherShare);

  return {
    totalPayments: totalGross,
    teacherShare: teacherRounded,
    centerShare: totalGross - teacherRounded,
    byStudent: list,
  };
}

export async function getAdminFinanceOverview(month: number, year: number) {
  const { start, end } = startEndOfMonth(new Date(year, month - 1, 1));

  const teachers = await User.find({ role: 'teacher' }).select('username displayName _id').lean();

  const result: {
    teacherId: string;
    username: string;
    displayName: string;
    totalPayments: number;
    teacherShare: number;
    centerShare: number;
    byStudent: { studentId: string; name: string; amount: number; teacherPart: number; centerPart: number }[];
  }[] = [];

  for (const t of teachers) {
    const s = await getTeacherPaymentStats(t._id, month, year);
    result.push({
      teacherId: t._id.toString(),
      username: t.username,
      displayName: t.displayName || '',
      totalPayments: s.totalPayments,
      teacherShare: s.teacherShare,
      centerShare: s.centerShare,
      byStudent: s.byStudent,
    });
  }

  const unassigned = await Group.find({
    isActive: true,
    $and: [{ $or: [{ teacherUserId: { $exists: false } }, { teacherUserId: null }] }, { $or: [{ teacherUserId2: { $exists: false } }, { teacherUserId2: null }] }],
  })
    .select('_id')
    .lean();

  const unassignedGroupIds = unassigned.map((g) => g._id);

  let orphanTotal = 0;
  if (unassignedGroupIds.length > 0) {
    const stu = await Student.find({ groupId: { $in: unassignedGroupIds }, status: 'active' })
      .select('_id')
      .lean();
    const ids = stu.map((s) => s._id);
    const payments = await Payment.find({
      studentId: { $in: ids },
      createdAt: { $gte: start, $lte: end },
    }).lean();
    for (const p of payments) {
      orphanTotal += p.amount || 0;
    }
  }

  const assignedCenter = result.reduce((a, t) => a + t.centerShare, 0);
  const totalTeacherPayouts = result.reduce((a, t) => a + t.teacherShare, 0);
  const assignedInflow = result.reduce((a, t) => a + t.totalPayments, 0);
  const totalInflow = assignedInflow + orphanTotal;

  return {
    month,
    year,
    teachers: result,
    summary: {
      totalInflow,
      totalTeacherPayouts,
      totalCenterFromAssigned: assignedCenter,
      orphanGroupPayments: orphanTotal,
      centerFromOrphans: orphanTotal,
      totalCenter: assignedCenter + orphanTotal,
    },
  };
}

export function expectedShareFromStudentDoc(s: Parameters<typeof computeStudentFinalPrice>[0]) {
  const m = computeStudentFinalPrice(s);
  const pct = DEFAULT_TEACHER_SHARE_PCT / 100;
  return {
    monthly: m,
    teacherPart: Math.round(m * pct),
    centerPart: Math.round(m * (1 - pct)),
  };
}

/** Real vaqtda bitta guruh uchun tushum / taqsimot (admin). */
export async function getGroupFinanceSnapshot(groupId: Types.ObjectId) {
  const g = await Group.findById(groupId).lean();
  if (!g) return null;

  const now = new Date();
  const { start, end } = startEndOfMonth(now);

  const students = await Student.find({ groupId, status: 'active' })
    .select('_id name monthlyPrice basePrice discountAmount discountEndDate')
    .lean();
  const ids = students.map((s) => s._id);

  const payments = await Payment.find({
    studentId: { $in: ids },
    createdAt: { $gte: start, $lte: end },
  }).lean();

  let inflow = 0;
  let teacherPart = 0;
  let centerPart = 0;
  for (const p of payments) {
    const amt = p.amount || 0;
    inflow += amt;
    const { teacherTotal, centerPart: c } = splitTeacherAmount(amt, g);
    teacherPart += teacherTotal;
    centerPart += c;
  }

  const expectedMonthly = students.reduce((s, st) => s + computeStudentFinalPrice(st), 0);

  return {
    groupId: groupId.toString(),
    groupName: g.name,
    studentCount: students.length,
    expectedMonthlyTuition: expectedMonthly,
    monthInflow: inflow,
    teacherShareMonth: teacherPart,
    centerShareMonth: centerPart,
    teacherSharePercent: g.teacherSharePercent ?? DEFAULT_TEACHER_SHARE_PCT,
    teacherPayoutFixed: g.teacherPayoutFixed ?? 0,
  };
}
