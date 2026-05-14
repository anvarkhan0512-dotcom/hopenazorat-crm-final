import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
  centerId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', index: true },
  },
  { timestamps: true }
);

BranchSchema.index({ centerId: 1, name: 1 }, { unique: true, sparse: true });

export const Branch: Model<IBranch> = mongoose.models.Branch || mongoose.model<IBranch>('Branch', BranchSchema);
