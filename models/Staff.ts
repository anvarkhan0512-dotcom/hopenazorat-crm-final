import mongoose, { Schema, Document, Model } from 'mongoose';

export type StaffPosition = 'teacher' | 'admin' | 'reception' | 'other';

export interface IStaff extends Document {
  fullName: string;
  position: StaffPosition;
  monthlySalary: number;
  phone: string;
  userId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    fullName: { type: String, required: true, index: true },
    position: {
      type: String,
      enum: ['teacher', 'admin', 'reception', 'other'],
      required: true,
      index: true,
    },
    monthlySalary: { type: Number, required: true, default: 0, index: true },
    phone: { type: String, default: '' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true, index: true },
  },
  { timestamps: true }
);

StaffSchema.index({ position: 1, fullName: 1 });

export const Staff: Model<IStaff> =
  mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);
