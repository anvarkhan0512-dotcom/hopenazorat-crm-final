import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILoginHistory extends Document {
  userId: mongoose.Types.ObjectId;
  timestamp: Date;
  userAgent: string;
  ip: string;
  centerId?: mongoose.Types.ObjectId;
}

const LoginHistorySchema = new Schema<ILoginHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', index: true },
  },
  { timestamps: false }
);

export const LoginHistory: Model<ILoginHistory> = 
  mongoose.models.LoginHistory || mongoose.model<ILoginHistory>('LoginHistory', LoginHistorySchema);
