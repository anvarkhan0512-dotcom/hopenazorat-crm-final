import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPayment extends Document {
  studentId: mongoose.Types.ObjectId;
  amount: number;
  month: number;
  year: number;
  description: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    amount: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ studentId: 1, year: -1, month: -1 });
PaymentSchema.index({ year: 1, month: 1, createdAt: -1 });
PaymentSchema.index({ studentId: 1, createdAt: -1 });
PaymentSchema.index({ createdAt: 1, studentId: 1 });

export const Payment: Model<IPayment> = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);