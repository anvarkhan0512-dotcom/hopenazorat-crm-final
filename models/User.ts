import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type UserRole = 'admin' | 'manager' | 'teacher' | 'parent' | 'student';

export interface IUser extends Document {
  username: string;
  password: string;
  role: UserRole;
  displayName?: string;
  /** For parent role: students this account can view */
  linkedStudentIds: Types.ObjectId[];
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'teacher', 'parent', 'student'],
      default: 'parent',
      index: true,
    },
    displayName: { type: String, default: '' },
    linkedStudentIds: [{ type: Schema.Types.ObjectId, ref: 'Student', index: true }],
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, createdAt: -1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export function isAdminRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'manager';
}
