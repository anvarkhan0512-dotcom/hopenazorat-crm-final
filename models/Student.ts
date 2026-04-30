import mongoose, { Schema, Document, Model } from 'mongoose';

/** Effective monthly charge after discount rules (discount expires → base only). */
export function computeStudentFinalPrice(s: {
  basePrice?: number;
  monthlyPrice?: number;
  discountAmount?: number;
  discountEndDate?: Date | null;
}): number {
  const hasBase = s.basePrice != null && s.basePrice > 0;
  const rawBase = hasBase ? (s.basePrice as number) : (s.monthlyPrice ?? 0);
  const disc = s.discountAmount ?? 0;
  const end = s.discountEndDate ? new Date(s.discountEndDate) : null;
  if (disc > 0 && end) {
    const endDay = new Date(end);
    endDay.setHours(23, 59, 59, 999);
    if (new Date() <= endDay) {
      return Math.max(0, rawBase - disc);
    }
  }
  return rawBase;
}

export type ParentType = 'father' | 'mother';

export interface IStudent extends Document {
  name: string;
  phone: string;
  /** Qo‘shimcha telefonlar; birinchi login uchun ham ishlatiladi */
  phones: string[];
  /** Kelgan sanasi */
  arrivalDate?: Date;
  /** Ota yoki ona */
  parentType?: ParentType;
  groupId?: mongoose.Types.ObjectId;
  status: 'active' | 'inactive';
  /** Base monthly tuition before discount */
  basePrice: number;
  discountAmount: number;
  discountEndDate?: Date;
  /** Stored effective price (synced on save); use computeStudentFinalPrice when reading stale lean docs */
  monthlyPrice: number;
  paymentCycle: 'monthly' | 'weekly' | 'quarterly' | 'yearly' | 'custom';
  customPaymentDays: number[];
  /** Registration / anchor date for billing cycle day-of-month */
  paymentStartDate: Date;
  paymentEndDate?: Date;
  nextPaymentDate: Date;
  lastPaymentDate?: Date;
  parentPhone?: string;
  parentName?: string;
  /** Unique code (e.g. for parent self-link / display in admin) */
  parentAccessCode?: string;
  /** After link, which user account owns this child view */
  parentUserId?: mongoose.Types.ObjectId;
  /** Login account for the student (role student, linkedStudentIds[0] === this doc) */
  studentUserId?: mongoose.Types.ObjectId;
  /** Grades / scores shown on student panel */
  scoreRecords?: { title: string; value: number; maxValue: number; recordedAt: Date }[];
  /** Parent Telegram chat for payment reminders (separate from center CHAT_ID) */
  parentTelegramChatId?: string;
  lastParentPaymentReminderAt?: Date;
  /** Qarz uchun Telegram eslatmalari shu sanagacha (kunlik) */
  debtReminderUntil?: Date;
  lastDebtorTelegramAt?: Date;
  notificationEnabled: boolean;
  createdAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name: { type: String, required: true, index: true },
    phone: { type: String, required: true, index: true },
    phones: { type: [String], default: [] },
    arrivalDate: { type: Date },
    parentType: { type: String, enum: ['father', 'mother', ''], default: '' },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', index: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    basePrice: { type: Number, default: 0, index: true },
    discountAmount: { type: Number, default: 0 },
    discountEndDate: { type: Date },
    monthlyPrice: { type: Number, default: 0, index: true },
    paymentCycle: {
      type: String,
      enum: ['monthly', 'weekly', 'quarterly', 'yearly', 'custom'],
      default: 'monthly',
      index: true,
    },
    customPaymentDays: { type: [Number], default: [] },
    paymentStartDate: { type: Date, default: () => new Date() },
    paymentEndDate: { type: Date },
    nextPaymentDate: { type: Date, index: true },
    lastPaymentDate: { type: Date },
    parentPhone: { type: String, default: '' },
    parentName: { type: String, default: '' },
    parentAccessCode: { type: String, sparse: true, unique: true, index: true },
    parentUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true, index: true },
    scoreRecords: {
      type: [
        {
          title: { type: String, required: true },
          value: { type: Number, required: true },
          maxValue: { type: Number, default: 100 },
          recordedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    parentTelegramChatId: { type: String, default: '', index: true },
    lastParentPaymentReminderAt: { type: Date },
    debtReminderUntil: { type: Date, index: true },
    lastDebtorTelegramAt: { type: Date },
    notificationEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

StudentSchema.virtual('finalPrice').get(function (this: IStudent) {
  return computeStudentFinalPrice(this);
});

StudentSchema.set('toJSON', { virtuals: true });
StudentSchema.set('toObject', { virtuals: true });

StudentSchema.pre('save', function (next) {
  const doc = this as IStudent;
  const list = (doc.phones || []).map((p) => String(p).trim()).filter(Boolean);
  if (list.length === 0 && doc.phone) {
    doc.phones = [doc.phone];
  } else if (list.length > 0) {
    doc.phones = list;
    doc.phone = list[0];
  }
  if ((doc.basePrice == null || doc.basePrice === 0) && doc.monthlyPrice > 0) {
    doc.basePrice = doc.monthlyPrice;
  }
  doc.monthlyPrice = computeStudentFinalPrice(doc);
  next();
});

StudentSchema.index({ name: 'text', phone: 'text' });
StudentSchema.index({ status: 1, groupId: 1 });
StudentSchema.index({ nextPaymentDate: 1 });
StudentSchema.index({ nextPaymentDate: 1, status: 1 });

export const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
