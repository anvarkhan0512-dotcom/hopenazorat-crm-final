import mongoose, { Schema, Document, Model } from 'mongoose';

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface IWeeklySlot {
  day: WeekdayIndex;
  /** HH:mm 24h */
  time: string;
}

export interface IGroup extends Document {
  name: string;
  teacherName: string;
  /** Link to User with role teacher (for panel & salary) */
  teacherUserId?: mongoose.Types.ObjectId;
  /** Ikkinchi ustoz (maks. 2 ta) */
  teacherUserId2?: mongoose.Types.ObjectId;
  schedule: string;
  weeklySchedule: IWeeklySlot[];
  lessonDays: string[];
  startTime: string;
  endTime: string;
  price: number;
  /** Ustoz ulushi foizi (masalan 30). teacherPayoutFixed bo‘sh bo‘lsa ishlatiladi */
  teacherSharePercent: number;
  /** To‘lovdan ustozga fiksirlangan summa (cheklangan); bo‘sh yoki 0 bo‘lsa foiz */
  teacherPayoutFixed: number;
  /** Dars sanalari: barcha haftalar | faqat ISO toq haftalar | faqat juft haftalar */
  lessonCalendarWeekParity: 'all' | 'odd' | 'even';
  studentIds: mongoose.Types.ObjectId[];
  centerId?: mongoose.Types.ObjectId;
  createdAt: Date;
  isActive: boolean;
  maxStudents: number;
  room: string;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    teacherName: { type: String, required: true, index: true },
    teacherUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    teacherUserId2: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    schedule: { type: String, default: '' },
    weeklySchedule: {
      type: [
        {
          day: { type: Number, min: 0, max: 6 },
          time: { type: String, default: '09:00' },
        },
      ],
      default: [],
    },
    lessonDays: { type: [String], default: [] },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '10:30' },
    price: { type: Number, default: 0, index: true },
    teacherSharePercent: { type: Number, default: 30 },
    teacherPayoutFixed: { type: Number, default: 0 },
    lessonCalendarWeekParity: {
      type: String,
      enum: ['all', 'odd', 'even'],
      default: 'all',
    },
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student', index: true }],
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', index: true },
    isActive: { type: Boolean, default: true, index: true },
    maxStudents: { type: Number, default: 30 },
    room: { type: String, default: '' },
  },
  { timestamps: true }
);

GroupSchema.index({ centerId: 1, name: 1 }, { unique: true, sparse: true });
GroupSchema.index({ isActive: 1, price: 1 });
GroupSchema.index({ teacherUserId: 1, isActive: 1 });

export const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);
