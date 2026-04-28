import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDiscount extends Document {
  studentIds: mongoose.Types.ObjectId[];
  familyId?: string;
  familyName: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  originalTotal: number;
  discountAmount: number;
  finalTotal: number;
  reason: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student', index: true }],
    familyId: { type: String, index: true },
    familyName: { type: String, required: true, index: true },
    discountType: { 
      type: String, 
      enum: ['percentage', 'fixed'], 
      default: 'percentage',
      index: true 
    },
    discountValue: { type: Number, required: true, min: 0 },
    originalTotal: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    finalTotal: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

DiscountSchema.index({ familyId: 1 }, { unique: true, sparse: true });
DiscountSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

export const Discount: Model<IDiscount> = mongoose.models.Discount || mongoose.model<IDiscount>('Discount', DiscountSchema);