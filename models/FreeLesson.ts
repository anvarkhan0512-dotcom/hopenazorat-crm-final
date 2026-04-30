import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFreeLesson extends Document {
  studentId: mongoose.Types.ObjectId;
  /** Ma'lumotlar / qo'shimcha */
  notes: string;
  outcome: 'stayed' | 'left' | '';
  reason: string;
  notifyTeacherUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FreeLessonSchema = new Schema<IFreeLesson>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    notes: { type: String, default: '' },
    outcome: { type: String, enum: ['stayed', 'left', ''], default: '' },
    reason: { type: String, default: '' },
    notifyTeacherUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

FreeLessonSchema.index({ studentId: 1, createdAt: -1 });

export const FreeLesson: Model<IFreeLesson> =
  mongoose.models.FreeLesson || mongoose.model<IFreeLesson>('FreeLesson', FreeLessonSchema);
