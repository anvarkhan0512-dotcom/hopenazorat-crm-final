import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type UserRole = 'admin' | 'manager' | 'teacher' | 'parent' | 'student' | 'boss';

export interface IUser extends Document {
  username: string;
  password: string;
  role: UserRole;
  displayName?: string;
  avatarUrl?: string;
  /** Ustozga bildirishnomalar (Telegram chat id) */
  telegramChatId?: string;
  /**
   * Admin yaratganida bir martalik ko‘rsatish uchun saqlanadi (ichki CRM).
   * Foydalanuvchi parolini o‘zgartirganda tozalanadi.
   */
  revealablePassword?: string;
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
      enum: ['admin', 'manager', 'teacher', 'parent', 'student', 'boss'],
      default: 'parent',
      index: true,
    },
    displayName: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    telegramChatId: { type: String, default: '', index: true },
    telegramCode: { type: String, default: null },
    telegramCodeExpiry: { type: Date, default: null },
    telegramUsername: { type: String, default: '' },
    revealablePassword: { type: String, default: '' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true },
    linkedStudentIds: [{ type: Schema.Types.ObjectId, ref: 'Student', index: true }],
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, createdAt: -1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export function isAdminRole(role: string | undefined): boolean {
  return role === 'admin' || role === 'manager' || role === 'boss';
}
