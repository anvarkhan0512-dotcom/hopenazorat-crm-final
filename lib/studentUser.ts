import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { Types } from 'mongoose';
import { User } from '@/models/User';

/** Creates a login user for a student; username is stable `s_<studentObjectId>`. */
export async function createStudentLoginUser(params: {
  studentId: Types.ObjectId;
  displayName: string;
}) {
  const plainPassword = crypto.randomBytes(6).toString('base64url').slice(0, 12) + '1a';
  const password = await bcrypt.hash(plainPassword, 10);
  const username = `s_${params.studentId.toString()}`;
  const user = await User.create({
    username,
    password,
    role: 'student',
    displayName: params.displayName,
    linkedStudentIds: [params.studentId],
  });
  return { user, username, plainPassword };
}
