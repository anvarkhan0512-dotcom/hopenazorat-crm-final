import connectDB from '@/lib/db';
import { Attendance } from '@/models/Attendance';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { sendTelegramMessage } from '@/lib/telegram';

function normalizeStatus(
  status: 'present' | 'absent' | 'late' | 'excused' | 'makeup'
): 'present' | 'absent' {
  if (status === 'absent') return 'absent';
  return 'present';
}

function dayAtNoon(isoDate: string): Date {
  const d = new Date(isoDate);
  d.setHours(12, 0, 0, 0);
  return d;
}

export interface AttendanceRecord {
  _id: string;
  studentId: string;
  studentName: string;
  groupId?: string;
  groupName?: string;
  lessonDate: string;
  lessonTime: string;
  subject: string;
  teacherName: string;
  status: string;
  notes: string;
  lessonNumber?: number;
}

export interface AttendanceStats {
  totalLessons: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  makeup: number;
  attendanceRate: number;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, { uz: string; ru: string; en: string }> = {
    present: { uz: 'Keldi', ru: 'Присутствовал', en: 'Present' },
    absent: { uz: 'Keldi emas', ru: 'Отсутствовал', en: 'Absent' },
    rescheduled: { uz: "Ko'chirildi", ru: 'Перенесено', en: 'Rescheduled' },
    late: { uz: 'Kechikdi', ru: 'Опоздал', en: 'Late' },
    excused: { uz: 'Sababli', ru: 'Уважительная причина', en: 'Excused' },
    makeup: { uz: 'Qoplamadi', ru: 'Отработка', en: 'Make-up' },
  };
  return labels[status]?.uz || status;
}

export async function markAttendance(data: {
  studentId: string;
  groupId?: string;
  lessonDate: string;
  lessonTime: string;
  subject: string;
  teacherName: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'makeup';
  notes?: string;
  notifyParent?: boolean;
}): Promise<{ success: boolean; attendance?: any; error?: string }> {
  await connectDB();

  try {
    const student = await Student.findById(data.studentId);
    if (!student) {
      return { success: false, error: 'Student not found' };
    }

    const date = dayAtNoon(data.lessonDate);
    const lessonNumber = 1;
    const storedStatus = normalizeStatus(data.status);

    const existing = await Attendance.findOne({
      studentId: data.studentId,
      date,
      lessonNumber,
    });

    if (existing) {
      existing.status = storedStatus;
      await existing.save();

      return { success: true, attendance: existing };
    }

    const attendance = new Attendance({
      studentId: data.studentId,
      groupId: data.groupId || student.groupId,
      date,
      lessonNumber,
      status: storedStatus,
    });

    await attendance.save();

    if (data.notifyParent && data.status === 'absent') {
      const group = await Group.findById(data.groupId || student.groupId);

      await sendTelegramMessage(
        `⚠️ <b>Darsga kelmaganligi haqida</b>\n\n` +
          `Oʻquvchi: ${student.name}\n` +
          `Guruh: ${group?.name || '—'}\n` +
          `Sana: ${data.lessonDate}\n` +
          `Vaqt: ${data.lessonTime}\n` +
          `Fan: ${data.subject}\n` +
          `Ustoz: ${data.teacherName}`
      );
    }

    return { success: true, attendance };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markBulkAttendance(data: {
  groupId: string;
  lessonDate: string;
  lessonTime: string;
  subject: string;
  teacherName: string;
  attendances: { studentId: string; status: string }[];
  notifyAbsent?: boolean;
}): Promise<{ success: boolean; marked: number; errors: string[] }> {
  await connectDB();

  const results = {
    success: true,
    marked: 0,
    errors: [] as string[],
  };

  for (const item of data.attendances) {
    try {
      await markAttendance({
        studentId: item.studentId,
        groupId: data.groupId,
        lessonDate: data.lessonDate,
        lessonTime: data.lessonTime,
        subject: data.subject,
        teacherName: data.teacherName,
        status: item.status as any,
        notifyParent: data.notifyAbsent && item.status === 'absent',
      });

      results.marked++;
    } catch (error: any) {
      results.errors.push(error.message);
    }
  }

  return results;
}

export async function getStudentAttendance(
  studentId: string,
  month?: number,
  year?: number
): Promise<AttendanceStats & { records: AttendanceRecord[] }> {
  await connectDB();

  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

  const records = await Attendance.find({
    studentId,
    date: { $gte: startDate, $lte: endDate },
  })
    .populate('studentId', 'name')
    .sort({ date: -1, lessonNumber: -1 })
    .lean();

  const stats: AttendanceStats = {
    totalLessons: records.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    makeup: 0,
    attendanceRate: 0,
  };

  for (const record of records) {
    const st = record.status as string;
    if (st === 'present') stats.present++;
    else if (st === 'absent') stats.absent++;
    else if (st === 'rescheduled') stats.excused++;
  }

  const attended = stats.present + stats.late + stats.excused + stats.makeup;
  stats.attendanceRate =
    stats.totalLessons > 0 ? Math.round((attended / stats.totalLessons) * 100) : 0;

  return {
    ...stats,
    records: records.map((r: any) => ({
      _id: r._id,
      studentId: r.studentId?._id || r.studentId,
      studentName: r.studentId?.name || '',
      lessonDate: r.date?.toISOString()?.split('T')[0],
      lessonTime: '',
      subject: '',
      teacherName: '',
      status: r.status,
      notes: '',
      lessonNumber: r.lessonNumber,
    })),
  };
}

export async function getGroupAttendance(
  groupId: string,
  date?: string
): Promise<{ date: string; records: any[]; summary: any }> {
  await connectDB();

  const targetDate = date || new Date().toISOString().split('T')[0];
  const group = await Group.findById(groupId);

  if (!group) {
    return { date: targetDate, records: [], summary: {} };
  }

  const day = dayAtNoon(targetDate);

  const records = await Attendance.find({
    groupId,
    date: day,
  })
    .populate('studentId', 'name phone')
    .lean();

  const studentIds = group.studentIds || [];
  const studentMap = new Map(records.map((r: any) => [r.studentId?._id?.toString() || r.studentId, r]));

  const summary = {
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    makeup: 0,
    total: studentIds.length,
    marked: records.length,
  };

  for (const [, record] of Array.from(studentMap.entries())) {
    const st = record.status as string;
    if (st === 'present') summary.present++;
    else if (st === 'absent') summary.absent++;
    else if (st === 'rescheduled') summary.excused++;
  }

  return {
    date: targetDate,
    records: records.map((r: any) => ({
      _id: r._id,
      studentId: r.studentId?._id,
      studentName: r.studentId?.name,
      phone: r.studentId?.phone,
      subject: '',
      teacherName: '',
      lessonTime: '',
      status: r.status,
    })),
    summary,
  };
}

export async function addMakeupClass(data: {
  studentId: string;
  lessonDate: string;
  lessonTime: string;
  subject: string;
  teacherName: string;
  notes?: string;
}): Promise<{ success: boolean; attendance?: any; error?: string }> {
  return markAttendance({
    ...data,
    status: 'makeup',
  });
}

export async function getAttendanceReport(
  groupId?: string,
  month?: number,
  year?: number
): Promise<{
  byStudent: any[];
  byDate: any[];
  summary: any;
}> {
  await connectDB();

  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

  const matchQuery: any = {
    date: { $gte: startDate, $lte: endDate },
  };

  if (groupId) {
    matchQuery.groupId = groupId;
  }

  const byStudent = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$studentId',
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
        excused: {
          $sum: {
            $cond: [
              {
                $or: [{ $eq: ['$status', 'excused'] }, { $eq: ['$status', 'rescheduled'] }],
              },
              1,
              0,
            ],
          },
        },
        makeup: { $sum: { $cond: [{ $eq: ['$status', 'makeup'] }, 1, 0] } },
      },
    },
    {
      $addFields: {
        attendanceRate: {
          $round: [
            {
              $multiply: [
                { $divide: [{ $add: ['$present', '$late', '$excused', '$makeup'] }, '$total'] },
                100,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { attendanceRate: 1 } },
    { $limit: 20 },
  ]);

  const byDate = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  const summary = {
    totalStudents: byStudent.length,
    avgAttendance: byStudent.reduce((sum, s) => sum + (s.attendanceRate || 0), 0) / (byStudent.length || 1),
    totalLessons: byDate.reduce((sum, d) => sum + d.total, 0),
  };

  return { byStudent, byDate, summary };
}
