import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INotificationLog extends Document {
  type: 'sms' | 'telegram';
  recipientId: mongoose.Types.ObjectId; // User yoki Student ID
  recipientName: string;
  recipientPhone?: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  error?: string;
  branchId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    type: { type: String, enum: ['sms', 'telegram'], required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true },
    recipientName: { type: String, required: true },
    recipientPhone: { type: String },
    message: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed', 'pending'], default: 'pending' },
    error: { type: String },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  },
  { timestamps: true }
);

NotificationLogSchema.index({ createdAt: -1 });
NotificationLogSchema.index({ type: 1, status: 1 });

export const NotificationLog: Model<INotificationLog> = mongoose.models.NotificationLog || mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);
