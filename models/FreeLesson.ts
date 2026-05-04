import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFreeLesson extends Document {
  studentName: string;
  totalFreeLessons: number;
  attendedCount: number;
  missedCount: number;
  teacherId?: mongoose.Types.ObjectId;
  otherTeacher?: string;
  arrivalDate: Date;
  lessonDays: string[]; // ['Du', 'Se', ...]
  lessonTime: string; // 'HH:mm'
  status: 'Qoldi' | 'Ketdi' | '-';
  leaveReason?: 'Dars' | 'Ustoz' | 'Vaqt' | 'Boshqa';
  notes: string;
  notifyTeacherId?: mongoose.Types.ObjectId;
  otherNotifyTeacher?: string;
  lastLessonDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FreeLessonSchema = new Schema<IFreeLesson>(
  {
    studentName: { type: String, required: true, index: true },
    totalFreeLessons: { type: Number, default: 0 },
    attendedCount: { type: Number, default: 0 },
    missedCount: { type: Number, default: 0 },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    otherTeacher: { type: String, default: '' },
    arrivalDate: { type: Date, required: true },
    lessonDays: { type: [String], default: [] },
    lessonTime: { type: String, default: '' },
    status: { type: String, enum: ['Qoldi', 'Ketdi', '-'], default: '-' },
    leaveReason: { type: String, enum: ['Dars', 'Ustoz', 'Vaqt', 'Boshqa', ''], default: '' },
    notes: { type: String, default: '' },
    notifyTeacherId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    otherNotifyTeacher: { type: String, default: '' },
    lastLessonDate: { type: Date },
  },
  { timestamps: true }
);

FreeLessonSchema.index({ studentName: 1, status: 1 });

export const FreeLesson: Model<IFreeLesson> =
  mongoose.models.FreeLesson || mongoose.model<IFreeLesson>('FreeLesson', FreeLessonSchema);
