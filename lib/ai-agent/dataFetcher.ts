import connectDB from '@/lib/db';
import { Student } from '@/models/Student';
import { Group } from '@/models/Group';
import { Payment } from '@/models/Payment';
import { User } from '@/models/User';
import { Attendance } from '@/models/Attendance';
import { Invoice } from '@/models/Invoice';
import mongoose, { Types } from 'mongoose';

export async function fetchContextData(message: string, role: string, centerId: string | null, userId: string) {
  await connectDB();
  const msg = message.toLowerCase();
  const data: any = {};
  
  // Normalize centerId filter to match other API routes
  const centerFilter: any = {};
  if (centerId) {
    centerFilter.centerId = new mongoose.Types.ObjectId(centerId);
  } else if (role !== 'boss') {
    centerFilter.$or = [
      { centerId: { $exists: false } },
      { centerId: null }
    ];
  }

  // BOSS query logic - no center restriction
  const filter = role === 'boss' ? {} : centerFilter;

  console.log('DEBUG AI Agent - centerId:', centerId);
  console.log('DEBUG AI Agent - role:', role);
  console.log('DEBUG AI Agent - filter:', JSON.stringify(filter));

  // Intent parsing
  const isStudent = msg.includes('talaba') || msg.includes('o\'quvchi');
  const isPayment = msg.includes('to\'lov') || msg.includes('pul') || msg.includes('daromad');
  const isGroup = msg.includes('guruh');
  const isStaff = msg.includes('xodim') || msg.includes('ustoz') || msg.includes('o\'qituvchi');
  const isDebt = msg.includes('qarz') || msg.includes('qarzdor');
  const isAttendance = msg.includes('davomat') || msg.includes('keldi');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

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
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const [recentPayments, monthlyStats] = await Promise.all([
          Payment.find({ ...filter, month: currentMonth, year: currentYear }).sort({ createdAt: -1 }).limit(10).lean(),
          Payment.aggregate([
            { $match: { ...filter, month: currentMonth, year: currentYear } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
          ])
        ]);
        
        data.recentPayments = recentPayments;
        data.monthlyStats = monthlyStats[0] || { total: 0, count: 0 };
      }
    }

    if (isDebt && (role === 'admin' || role === 'boss')) {
      const [debtorsInvoices, debtorsSummary] = await Promise.all([
        Invoice.find({ ...filter, month: currentMonth, year: currentYear, status: { $ne: 'paid' } })
          .populate('studentId', 'name phone')
          .sort({ amount: -1 })
          .limit(15)
          .lean(),
        Invoice.aggregate([
          { $match: { ...filter, month: currentMonth, year: currentYear, status: { $ne: 'paid' } } },
          { $group: { _id: null, totalDebt: { $sum: { $subtract: ['$amount', '$paidAmount'] } }, count: { $sum: 1 } } }
        ])
      ]);

      data.debtors = debtorsInvoices.map((inv: any) => ({
        name: inv.studentId?.name || 'Noma\'lum',
        phone: inv.studentId?.phone || '',
        debt: inv.amount - inv.paidAmount
      }));
      data.debtSummary = debtorsSummary[0] || { totalDebt: 0, count: 0 };
      
      console.log('DEBUG AI Agent - debtors count:', data.debtSummary.count);
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

