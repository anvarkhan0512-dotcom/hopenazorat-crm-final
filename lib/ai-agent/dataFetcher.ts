import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { Payment } from '@/models/Payment';
import { User } from '@/models/User';
import { Attendance } from '@/models/Attendance';
import { Types } from 'mongoose';

export async function fetchContextData(message: string, role: string, centerId: string | null, userId: string) {
  await connectDB();
  const msg = message.toLowerCase();
  const data: any = {};
  
  const centerFilter = centerId 
    ? { centerId: new Types.ObjectId(centerId) } 
    : { $or: [{ centerId: { $exists: false } }, { centerId: null }] };

  // BOSS query logic - no center restriction
  const filter = role === 'boss' ? {} : centerFilter;

  // Intent parsing
  const isStudent = msg.includes('talaba') || msg.includes('o\'quvchi');
  const isPayment = msg.includes('to\'lov') || msg.includes('pul') || msg.includes('daromad');
  const isGroup = msg.includes('guruh');
  const isStaff = msg.includes('xodim') || msg.includes('ustoz') || msg.includes('o\'qituvchi');
  const isDebt = msg.includes('qarz') || msg.includes('qarzdor');
  const isAttendance = msg.includes('davomat') || msg.includes('keldi');

  try {
    if (isStudent) {
      if (role === 'teacher') {
        const groups = await Group.find({ ...centerFilter, teacherUserId: userId }).select('_id');
        data.students = await Student.find({ ...centerFilter, groupId: { $in: groups.map(g => g._id) } }).limit(20).lean();
      } else if (role === 'student') {
        data.student = await Student.findOne({ ...centerFilter, studentUserId: userId }).lean();
      } else if (role === 'parent') {
        data.children = await Student.find({ ...centerFilter, parentUserId: userId }).lean();
      } else {
        data.students = await Student.find(filter).sort({ createdAt: -1 }).limit(20).lean();
      }
    }

    if (isGroup) {
      if (role === 'teacher') {
        data.groups = await Group.find({ ...centerFilter, teacherUserId: userId }).lean();
      } else if (role === 'student' || role === 'parent') {
        // Handled by student fetch usually, but for explicit group questions:
        const student = await Student.findOne({ ...centerFilter, studentUserId: userId });
        if (student?.groupId) {
          data.group = await Group.findById(student.groupId).lean();
        }
      } else {
        data.groups = await Group.find(filter).limit(20).lean();
      }
    }

    if (isPayment) {
      if (role === 'student') {
        const student = await Student.findOne({ ...centerFilter, studentUserId: userId });
        if (student) data.payments = await Payment.find({ ...centerFilter, studentId: student._id }).sort({ createdAt: -1 }).limit(10).lean();
      } else if (role === 'parent') {
        const kids = await Student.find({ ...centerFilter, parentUserId: userId });
        data.payments = await Payment.find({ ...centerFilter, studentId: { $in: kids.map(k => k._id) } }).sort({ createdAt: -1 }).limit(10).lean();
      } else {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        data.recentPayments = await Payment.find({ ...filter, createdAt: { $gte: startOfMonth } }).sort({ createdAt: -1 }).limit(20).lean();
        
        const stats = await Payment.aggregate([
          { $match: { ...filter, createdAt: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);
        data.monthlyStats = stats[0] || { total: 0, count: 0 };
      }
    }

    if (isDebt && (role === 'admin' || role === 'boss')) {
      data.debtors = await Student.find({ 
        ...filter, 
        status: 'active',
        lastPaymentDate: { $lt: new Date(Date.now() - 30*24*60*60*1000) }
      }).select('name phone monthlyPrice').limit(15).lean();
    }

    if (isStaff && (role === 'admin' || role === 'boss')) {
      data.staff = await User.find({ ...filter, role: { $in: ['teacher', 'manager'] } }).select('displayName role').limit(20).lean();
    }

    if (isAttendance && (role === 'teacher' || role === 'admin' || role === 'boss')) {
      data.recentAttendance = await Attendance.find(filter).sort({ date: -1 }).limit(10).lean();
    }

    return data;
  } catch (error) {
    console.error('Data fetcher error:', error);
    return { error: 'Ma\'lumotlarni olishda xatolik yuz berdi' };
  }
}
