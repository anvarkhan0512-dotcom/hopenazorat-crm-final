import mongoose, { Schema, Document } from 'mongoose';
import { ISMSLog } from '../lib/sms/types';

export interface SMSLogDocument extends ISMSLog, Document {}

const SMSLogSchema = new Schema<SMSLogDocument>({
  to: { type: String, required: true, index: true },
  message: { type: String, required: true },
  provider: { type: String, required: true, index: true },
  status: { type: String, enum: ['sent', 'failed', 'pending'], default: 'pending', index: true },
  centerId: { type: Schema.Types.ObjectId, ref: 'Center', index: true, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
  error: { type: String },
  messageId: { type: String },
});

export const SMSLog = mongoose.models.SMSLog || mongoose.model<SMSLogDocument>('SMSLog', SMSLogSchema);
