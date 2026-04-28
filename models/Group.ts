import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  teacherName: string;
  /** Link to User with role teacher (for panel & salary) */
  teacherUserId?: mongoose.Types.ObjectId;
  schedule: string;
  price: number;
  studentIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  isActive: boolean;
  maxStudents: number;
  room: string;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, index: true },
    teacherName: { type: String, required: true, index: true },
    teacherUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    schedule: { type: String, default: '' },
    price: { type: Number, default: 0, index: true },
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'Student', index: true }],
    isActive: { type: Boolean, default: true, index: true },
    maxStudents: { type: Number, default: 30 },
    room: { type: String, default: '' },
  },
  { timestamps: true }
);

GroupSchema.index({ name: 1 }, { unique: true });
GroupSchema.index({ isActive: 1, price: 1 });
GroupSchema.index({ teacherUserId: 1, isActive: 1 });

export const Group: Model<IGroup> = mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);
