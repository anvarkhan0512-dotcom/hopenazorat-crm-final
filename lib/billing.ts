import connectDB from '@/lib/db';
import { Student, computeStudentFinalPrice } from '@/models/Student';
import { Group } from '@/models/Group';
import { Invoice, type IInvoice } from '@/models/Invoice';
import { Payment } from '@/models/Payment';

export interface InvoiceGenerationResult {
  generated: number;
  errors: string[];
}

export async function generateMonthlyInvoices(
  month: number = new Date().getMonth() + 1,
  year: number = new Date().getFullYear()
): Promise<InvoiceGenerationResult> {
  await connectDB();

  const result: InvoiceGenerationResult = {
    generated: 0,
    errors: [],
  };

  try {
    const activeStudents = await Student.find({ status: 'active', monthlyPrice: { $gt: 0 } })
      .populate('groupId')
      .lean();

    for (const student of activeStudents) {
      try {
        const alreadyExists = await Invoice.findOne({
          studentId: student._id,
          month,
          year,
        });

        if (alreadyExists) {
          continue;
        }

        const group = student.groupId as any;
        const amount =
          computeStudentFinalPrice(student as any) || (group?.price || 0);

        if (amount <= 0) {
          continue;
        }

        const paymentExists = await Payment.findOne({
          studentId: student._id,
          month,
          year,
        });

        let status: 'pending' | 'partial' | 'paid' = 'pending';
        let paidAmount = 0;

        if (paymentExists) {
          paidAmount = paymentExists.amount;
          if (paidAmount >= amount) {
            status = 'paid';
          } else if (paidAmount > 0) {
            status = 'partial';
          }
        }

        const invoice = new Invoice({
          studentId: student._id,
          groupId: student.groupId,
          month,
          year,
          amount,
          paidAmount,
          status,
        });

        await invoice.save();
        result.generated++;
      } catch (error: any) {
        result.errors.push(`Error creating invoice for student ${student.name}: ${error.message}`);
      }
    }

    return result;
  } catch (error: any) {
    result.errors.push(`Generation failed: ${error.message}`);
    return result;
  }
}

export async function getInvoiceWithPayments(
  studentId: string,
  limit: number = 12
): Promise<any[]> {
  await connectDB();

  const invoices = await Invoice.find({ studentId })
    .sort({ year: -1, month: -1 })
    .limit(limit)
    .lean();

  return invoices;
}

export async function getAllInvoices(
  filters: {
    status?: string;
    month?: number;
    year?: number;
  } = {}
): Promise<any[]> {
  await connectDB();

  const query: any = {};

  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.month) {
    query.month = filters.month;
  }
  if (filters.year) {
    query.year = filters.year;
  }

  return Invoice.find(query)
    .populate('studentId', 'name phone')
    .populate('groupId', 'name')
    .sort({ year: -1, month: -1 })
    .lean();
}

export async function getDebtorsReport(
  month?: number,
  year?: number
): Promise<{
  debtors: any[];
  totalDebt: number;
  totalPaid: number;
  summary: {
    pending: number;
    partial: number;
    paid: number;
  };
}> {
  const currentMonth = month || new Date().getMonth() + 1;
  const currentYear = year || new Date().getFullYear();

  await connectDB();

  const [invoices, summary] = await Promise.all([
    Invoice.find({
      month: currentMonth,
      year: currentYear,
      status: { $ne: 'paid' },
    })
      .populate('studentId', 'name phone')
      .populate('groupId', 'name')
      .lean(),
    Invoice.aggregate([
      { $match: { month: currentMonth, year: currentYear } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalPaid: { $sum: '$paidAmount' },
        },
      },
    ]),
  ]);

  const debtors = invoices.map((inv: any) => ({
    _id: inv._id,
    studentId: inv.studentId?._id || inv.studentId,
    studentName: inv.studentId?.name,
    phone: inv.studentId?.phone,
    groupName: inv.groupId?.name,
    amount: inv.amount,
    paidAmount: inv.paidAmount,
    debt: inv.amount - inv.paidAmount,
    status: inv.status,
  }));

  const summaryResult = {
    pending: 0,
    partial: 0,
    paid: 0,
  };

  let totalDebt = 0;
  let totalPaid = 0;

  for (const s of summary) {
    if (s._id === 'pending') {
      summaryResult.pending = s.count;
      totalDebt += s.totalAmount;
    } else if (s._id === 'partial') {
      summaryResult.partial = s.count;
      totalDebt += s.totalAmount - s.totalPaid;
      totalPaid += s.totalPaid;
    } else {
      summaryResult.paid = s.count;
      totalPaid += s.totalPaid;
    }
  }

  return {
    debtors,
    totalDebt,
    totalPaid,
    summary: summaryResult,
  };
}

export async function markInvoiceAsPaid(
  invoiceId: string,
  amount: number
): Promise<IInvoice | null> {
  await connectDB();

  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;

  invoice.paidAmount += amount;
  const newTotal = invoice.paidAmount;

  if (newTotal >= invoice.amount) {
    invoice.status = 'paid';
    invoice.paidAmount = invoice.amount;
  } else if (newTotal > 0) {
    invoice.status = 'partial';
  }

  await invoice.save();
  return invoice;
}