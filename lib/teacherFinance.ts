import { Types } from 'mongoose';
import { Payment } from '@/models/Payment';
import { Student, computeStudentFinalPrice } from '@/models/Student';
import { Group } from '@/models/Group';
import { User } from '@/models/User';

export const TEACHER_SHARE = 0.3;
export const CENTER_SHARE = 0.7;

function startEndOfMonth(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Sum of actual payment amounts in month that flow from students in groups assigned to this teacher.
 * Teacher share = amount * TEACHER_SHARE (per payment).
 */
export async function getTeacherPaymentStats(
  teacherUserId: Types.ObjectId,
  month: number,
  year: number
) {
  const { start, end } = startEndOfMonth(new Date(year, month - 1, 1));

  const groupIds = await Group.find({ teacherUserId, isActive: true }).distinct('_id');
  if (groupIds.length === 0) {
    return {
      totalPayments: 0,
      teacherShare: 0,
      centerShare: 0,
      byStudent: [] as { studentId: string; name: string; amount: number; teacherPart: number; centerPart: number }[],
    };
  }

  const students = await Student.find({ groupId: { $in: groupIds }, status: 'active' })
    .select('_id name groupId')
    .lean();
  const studentMap = new Map(students.map((s) => [s._id.toString(), s]));

  const payments = await Payment.find({
    createdAt: { $gte: start, $lte: end },
  }).lean();

  let total = 0;
  const byStudent: Record<string, { name: string; amount: number }> = {};

  for (const p of payments) {
    const sid = p.studentId.toString();
    const stu = studentMap.get(sid);
    if (!stu) continue;
    const amt = p.amount || 0;
    total += amt;
    if (!byStudent[sid]) {
      byStudent[sid] = { name: (stu as { name: string }).name, amount: 0 };
    }
    byStudent[sid].amount += amt;
  }

  const list = Object.entries(byStudent).map(([studentId, v]) => ({
    studentId,
    name: v.name,
    amount: v.amount,
    teacherPart: Math.round(v.amount * TEACHER_SHARE),
    centerPart: Math.round(v.amount * CENTER_SHARE),
  }));

  return {
    totalPayments: total,
    teacherShare: Math.round(total * TEACHER_SHARE),
    centerShare: Math.round(total * CENTER_SHARE),
    byStudent: list,
  };
}

export async function getAdminFinanceOverview(month: number, year: number) {
  const { start, end } = startEndOfMonth(new Date(year, month - 1, 1));

  const teachers = await User.find({ role: 'teacher' })
    .select('username displayName _id')
    .lean();

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

  const unassigned = await Group.find({ isActive: true, $or: [{ teacherUserId: { $exists: false } }, { teacherUserId: null }] })
    .select('_id')
    .lean();
  const unassignedGroupIds = unassigned.map((g) => g._id);
  let orphanTotal = 0;
  if (unassignedGroupIds.length > 0) {
    const stu = await Student.find({ groupId: { $in: unassignedGroupIds }, status: 'active' })
      .select('_id name groupId monthlyPrice basePrice discountAmount discountEndDate')
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

  const totalCenter = result.reduce((a, t) => a + t.centerShare, 0) + Math.round(orphanTotal * CENTER_SHARE);
  const totalTeacherPayouts = result.reduce((a, t) => a + t.teacherShare, 0);
  const totalInflow = result.reduce((a, t) => a + t.totalPayments, 0) + orphanTotal;

  return {
    month,
    year,
    teachers: result,
    summary: {
      totalInflow,
      totalTeacherPayouts,
      totalCenterFromAssigned: result.reduce((a, t) => a + t.centerShare, 0),
      orphanGroupPayments: orphanTotal,
      centerFromOrphans: Math.round(orphanTotal * CENTER_SHARE),
      totalCenter,
    },
  };
}

/** Not used in payroll but available: “expected” share from current fee (if no payment yet). */
export function expectedShareFromStudentDoc(s: Parameters<typeof computeStudentFinalPrice>[0]) {
  const m = computeStudentFinalPrice(s);
  return {
    monthly: m,
    teacherPart: Math.round(m * TEACHER_SHARE),
    centerPart: Math.round(m * CENTER_SHARE),
  };
}
