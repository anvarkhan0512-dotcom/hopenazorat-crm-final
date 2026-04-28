import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInvoice extends Document {
  studentId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  amount: number;
  paidAmount: number;
  status: 'pending' | 'partial' | 'paid';
  dueDate: Date;
  createdAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', index: true },
    month: { type: Number, required: true, index: true },
    year: { type: Number, required: true, index: true },
    amount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['pending', 'partial', 'paid'], 
      default: 'pending',
      index: true 
    },
    dueDate: { type: Date, default: () => new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0) },
  },
  { timestamps: true }
);

InvoiceSchema.index({ studentId: 1, month: 1, year: 1 }, { unique: true });
InvoiceSchema.index({ status: 1, month: 1, year: 1 });

export const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);