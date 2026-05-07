import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStudent extends Document {
  name: string;
  phone: string;
  phones: string[];
  arrivalDate: Date;
  parentType: 'father' | 'mother' | '';
  parentName: string;
  parentPhone: string;
  parentAccessCode: string;
  parentUserId?: mongoose.Types.ObjectId;
  parentTelegramChatId?: string;
  groupId?: mongoose.Types.ObjectId;
  studentUserId?: mongoose.Types.ObjectId;
  status: 'active' | 'inactive' | 'left';
  scoreRecords: { date: Date; score: number; reason: string }[];
  monthlyPrice: number;
  basePrice: number;
  discountAmount: number;
  discountEndDate?: Date;
  paymentCycle: 'monthly' | 'weekly' | 'quarterly' | 'yearly' | 'custom' | 'lessons';
  lessonCount?: number;
  nextPaymentDate: Date;
  lastPaymentDate?: Date;
  paymentStartDate?: Date;
  paymentEndDate?: Date;
  extraFans: {
    groupId: mongoose.Types.ObjectId;
    price: number;
    discountAmount: number;
    discountEndDate?: Date;
  }[];
  extraDiscount: number;
  notificationEnabled: boolean;
  avatarUrl?: string;
  faceDescriptor?: number[];
  paymentDeadline?: Date;
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: Date;
  deadlineExtendCount: number;
  lessonStartDate?: Date;
  lessonDays: string[];
  paymentSchedule?: {
    startDate: Date;
    lessonDays: string[];
    weekOverrides: {
      week1?: string[] | null;
      week2?: string[] | null;
      week3?: string[] | null;
      week4?: string[] | null;
    };
    endDate: Date;
  };
  pauseStatus: 'active' | 'paused' | 'long-pause' | 'stopped';
  pauseStartDate?: Date;
  pauseEndDate?: Date;
  pauseType?: 'kanikul' | 'uzoq' | 'yakunlash';
  stopDate?: Date;
  schoolNumber: string;
  classNumber: string;
  createdAt: Date;
}

export function computeStudentFinalPrice(doc: any): number {
  const base = doc.basePrice || doc.monthlyPrice || 0;
  const disc = doc.discountAmount || 0;
  const extra = doc.extraDiscount || 0;
  return Math.max(0, base - disc - extra);
}

const StudentSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    phone: { type: String, required: true, index: true },
    phones: { type: [String], default: [] },
    arrivalDate: { type: Date, default: Date.now },
    parentType: { type: String, enum: ['father', 'mother', ''], default: '' },
    parentName: { type: String, default: '' },
    parentPhone: { type: String, default: '' },
    parentAccessCode: { type: String, default: '' },
    parentUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    parentTelegramChatId: { type: String, default: '' },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', index: true },
    studentUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'left'],
      default: 'active',
      index: true,
    },
    scoreRecords: [
      {
        date: { type: Date, default: Date.now },
        score: { type: Number, default: 0 },
        reason: { type: String, default: '' },
      },
    ],
    monthlyPrice: { type: Number, required: true, default: 0, index: true },
    basePrice: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    discountEndDate: { type: Date },
    paymentCycle: {
      type: String,
      enum: ['monthly', 'weekly', 'quarterly', 'yearly', 'custom', 'lessons'],
      default: 'monthly',
    },
    lessonCount: { type: Number, default: 0 },
    nextPaymentDate: { type: Date, default: Date.now, index: true },
    lastPaymentDate: { type: Date },
    paymentStartDate: { type: Date },
    paymentEndDate: { type: Date },
    extraFans: [
      {
        groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
        price: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        discountEndDate: { type: Date },
      },
    ],
    extraDiscount: { type: Number, default: 0 },
    notificationEnabled: { type: Boolean, default: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    paymentDeadline: { type: Date, index: true },
    isBlocked: { type: Boolean, default: false, index: true },
    blockReason: { type: String, default: '' },
    blockedAt: { type: Date },
    deadlineExtendCount: { type: Number, default: 0 },
    lessonStartDate: { type: Date },
    lessonDays: { type: [String], default: [] },
    paymentSchedule: {
      startDate: { type: Date },
      lessonDays: { type: [String], default: [] },
      weekOverrides: {
        week1: { type: [String], default: null },
        week2: { type: [String], default: null },
        week3: { type: [String], default: null },
        week4: { type: [String], default: null },
      },
      endDate: { type: Date },
    },
    pauseStatus: {
      type: String,
      enum: ['active', 'paused', 'long-pause', 'stopped'],
      default: 'active',
      index: true,
    },
    pauseStartDate: { type: Date },
    pauseEndDate: { type: Date },
    pauseType: { type: String, enum: ['kanikul', 'uzoq', 'yakunlash'] },
    stopDate: { type: Date },
    schoolNumber: { type: String, default: '' },
    classNumber: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    faceDescriptor: { type: [Number], default: undefined },
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
StudentSchema.index({ nextPaymentDate: 1, status: 1 });

export const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
