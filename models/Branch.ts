import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true, unique: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Branch: Model<IBranch> = mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);
