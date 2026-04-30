import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAttendance extends Document {
  studentId: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  date: Date;
  lessonNumber: number;
  status: 'present' | 'absent' | 'rescheduled' | 'transferred';
  rescheduleDate?: Date | null;
  checkInTime?: string | null;
  /** Ko‘chirildi / transferred */
  transferAt?: Date | null;
  redirectTeacherUserId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', index: true },
    date: { type: Date, required: true, index: true },
    lessonNumber: { type: Number, required: true, min: 1, max: 12 },
    status: {
      type: String,
      enum: ['present', 'absent', 'rescheduled', 'transferred'],
      default: 'present',
    },
    rescheduleDate: { type: Date, default: null },
    checkInTime: { type: String, default: null },
    transferAt: { type: Date, default: null },
    redirectTeacherUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

AttendanceSchema.index({ studentId: 1, date: 1, lessonNumber: 1 }, { unique: true });
AttendanceSchema.index({ groupId: 1, date: 1 });
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ studentId: 1, date: -1, status: 1 });
AttendanceSchema.index({ status: 1, date: -1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);
