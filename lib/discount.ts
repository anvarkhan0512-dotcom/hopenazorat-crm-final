import type { Language } from '@/lib/translations';
import connectDB from '@/lib/db';
import { Discount } from '@/models/Discount';
import { Student } from '@/models/Student';

export interface DiscountCalculation {
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  discountId?: string;
  discountType?: 'percentage' | 'fixed';
  discountReason?: string;
}

export interface StudentWithDiscount {
  _id?: unknown;
  name?: string;
  phone?: string;
  monthlyPrice?: number;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  discount?: {
    familyName: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    reason: string;
    endDate: Date;
  };
}

const discountReasons: Record<string, { uz: string; ru: string; en: string; kr: string }> = {
  family: {
    uz: 'Oilaviy chegirma',
    ru: 'Семейная скидка',
    en: 'Family discount',
    kr: 'Оилавий чегирма',
  },
  financial_aid: {
    uz: 'Moddiy yordam',
    ru: 'Материальная помощь',
    en: 'Financial aid',
    kr: 'Моддий ёрдам',
  },
  orphan: {
    uz: 'Yetim',
    ru: 'Сирота',
    en: 'Orphan',
    kr: 'Етим',
  },
  disabled: {
    uz: 'Nogiron',
    ru: 'Инвалид',
    en: 'Disabled',
    kr: 'Ногирон',
  },
  low_income: {
    uz: 'Kam ta\'minotli oila',
    ru: 'Малообеспеченная семья',
    en: 'Low income family',
    kr: 'Кам таъминотли оила',
  },
  excellent: {
    uz: 'A\'lochi baholar',
    ru: 'Отличники',
    en: 'Excellent grades',
    kr: 'Аълочи баҳоалар',
  },
  special: {
    uz: 'Maxsus chegirma',
    ru: 'Особая скидка',
    en: 'Special discount',
    kr: 'Махсус чегирма',
  },
  other: {
    uz: 'Boshqa',
    ru: 'Другое',
    en: 'Other',
    kr: 'Бошқа',
  },
};

export function getDiscountReasons() {
  return discountReasons;
}

export function getDiscountReasonLabel(reason: string, lang: Language = 'uz'): string {
  const row = discountReasons[reason];
  if (!row) return reason;
  return row[lang] || row.uz || reason;
}

export async function calculateStudentDiscount(
  studentId: string
): Promise<DiscountCalculation> {
  await connectDB();

  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  const now = new Date();
  const discount = await Discount.findOne({
    studentIds: studentId,
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  });

  if (!discount) {
    return {
      originalPrice: student.monthlyPrice,
      discountAmount: 0,
      finalPrice: student.monthlyPrice,
    };
  }

  let discountAmount = 0;
  
  if (discount.discountType === 'percentage') {
    discountAmount = Math.round(
      student.monthlyPrice * (discount.discountValue / 100)
    );
  } else {
    discountAmount = Math.min(discount.discountValue, student.monthlyPrice);
  }

  const finalPrice = student.monthlyPrice - discountAmount;

  return {
    originalPrice: student.monthlyPrice,
    discountAmount,
    finalPrice,
    discountId: discount._id.toString(),
    discountType: discount.discountType,
    discountReason: discount.reason,
  };
}

export async function calculateAllStudentsDiscounts(): Promise<StudentWithDiscount[]> {
  await connectDB();

  const now = new Date();
  
  const activeDiscounts = await Discount.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();

  const discountMap = new Map<string, any>();
  for (const discount of activeDiscounts) {
    for (const studentId of discount.studentIds) {
      discountMap.set(studentId.toString(), discount);
    }
  }

  const students = await Student.find({ status: 'active', monthlyPrice: { $gt: 0 } }).lean();

  const results: StudentWithDiscount[] = [];
  
  for (const student of students) {
    const discount = discountMap.get(student._id.toString());
    
    if (discount) {
      let discountAmount = 0;
      
      if (discount.discountType === 'percentage') {
        discountAmount = Math.round(
          student.monthlyPrice * (discount.discountValue / 100)
        );
      } else {
        discountAmount = Math.min(
          discount.discountValue / discount.studentIds.length,
          student.monthlyPrice
        );
      }

      const finalPrice = student.monthlyPrice - discountAmount;

      results.push({
        ...student,
        originalPrice: student.monthlyPrice,
        discountAmount,
        finalPrice,
        discount: {
          familyName: discount.familyName,
          discountType: discount.discountType,
          discountValue: discount.discountValue,
          reason: discount.reason,
          endDate: discount.endDate,
        },
      } as unknown as StudentWithDiscount);
    } else {
      results.push({
        ...student,
        originalPrice: student.monthlyPrice,
        discountAmount: 0,
        finalPrice: student.monthlyPrice,
      } as unknown as StudentWithDiscount);
    }
  }

  return results;
}

export async function createFamilyDiscount(data: {
  familyName: string;
  studentIds: string[];
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  reason: string;
  startDate: Date;
  endDate: Date;
}): Promise<{ success: boolean; discount: any; error?: string }> {
  await connectDB();

  try {
    const familyId = `family_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const students = await Student.find({
      _id: { $in: data.studentIds },
      status: 'active',
    }).lean();

    if (students.length === 0) {
      return { success: false, discount: null, error: 'No valid students found' };
    }

    const originalTotal = students.reduce((sum, s) => sum + (s.monthlyPrice || 0), 0);
    
    let discountAmount = 0;
    if (data.discountType === 'percentage') {
      discountAmount = Math.round(originalTotal * (data.discountValue / 100));
    } else {
      discountAmount = Math.min(data.discountValue, originalTotal);
    }

    const finalTotal = originalTotal - discountAmount;

    const discount = new Discount({
      studentIds: data.studentIds,
      familyId,
      familyName: data.familyName,
      discountType: data.discountType,
      discountValue: data.discountValue,
      originalTotal,
      discountAmount,
      finalTotal,
      reason: data.reason,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: true,
    });

    await discount.save();

    return { success: true, discount };
  } catch (error: any) {
    return { success: false, discount: null, error: error.message };
  }
}

export async function updateDiscount(
  discountId: string,
  data: Partial<{
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    reason: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  await connectDB();

  try {
    const discount = await Discount.findById(discountId);
    if (!discount) {
      return { success: false, error: 'Discount not found' };
    }

    if (data.discountType || data.discountValue !== undefined) {
      const students = await Student.find({
        _id: { $in: discount.studentIds },
      }).lean();

      const originalTotal = students.reduce((sum, s) => sum + (s.monthlyPrice || 0), 0);
      
      let discountValue = data.discountValue ?? discount.discountValue;
      let discountAmount = 0;
      
      if (data.discountType === 'percentage' || discount.discountType === 'percentage') {
        discountAmount = Math.round(originalTotal * (discountValue / 100));
      } else {
        discountAmount = Math.min(discountValue, originalTotal);
      }

      discount.originalTotal = originalTotal;
      discount.discountAmount = discountAmount;
      discount.finalTotal = originalTotal - discountAmount;
    }

    if (data.discountType) discount.discountType = data.discountType;
    if (data.discountValue !== undefined) discount.discountValue = data.discountValue;
    if (data.reason) discount.reason = data.reason;
    if (data.startDate) discount.startDate = data.startDate;
    if (data.endDate) discount.endDate = data.endDate;
    if (data.isActive !== undefined) discount.isActive = data.isActive;

    await discount.save();

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDiscountsSummary(): Promise<{
  activeDiscounts: number;
  totalDiscountAmount: number;
  studentsWithDiscounts: number;
  byReason: Record<string, number>;
}> {
  await connectDB();

  const now = new Date();
  
  const activeDiscounts = await Discount.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();

  const studentsWithDiscounts = new Set(
    activeDiscounts.flatMap(d => d.studentIds.map(s => s.toString()))
  ).size;

  const byReason: Record<string, number> = {};
  
  for (const discount of activeDiscounts) {
    if (!byReason[discount.reason]) {
      byReason[discount.reason] = 0;
    }
    byReason[discount.reason] += discount.discountAmount;
  }

  const totalDiscountAmount = activeDiscounts.reduce(
    (sum, d) => sum + d.discountAmount,
    0
  );

  return {
    activeDiscounts: activeDiscounts.length,
    totalDiscountAmount,
    studentsWithDiscounts,
    byReason,
  };
}