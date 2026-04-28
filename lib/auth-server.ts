import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import { User, isAdminRole, type UserRole } from '@/models/User';
import type { Types } from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'edu-crm-secret-key-2024';

export type AuthUser = {
  _id: Types.ObjectId;
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  linkedStudentIds: Types.ObjectId[];
};

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    await connectDB();
    const u = await User.findById(decoded.id).lean();
    if (!u) return null;
    return {
      _id: u._id,
      id: u._id.toString(),
      username: u.username,
      role: u.role as UserRole,
      displayName: u.displayName || '',
      linkedStudentIds: (u.linkedStudentIds || []) as Types.ObjectId[],
    };
  } catch {
    return null;
  }
}

export function requireAuthUser(u: AuthUser | null) {
  if (!u) {
    return { error: 'Unauthorized' as const, status: 401 as const };
  }
  return null;
}

export function requireAdmin(u: AuthUser | null) {
  const a = requireAuthUser(u);
  if (a) return a;
  if (!isAdminRole(u!.role)) {
    return { error: 'Forbidden' as const, status: 403 as const };
  }
  return null;
}

/** Only teachers (not admin) — for “my classes” APIs */
export function requireTeacherOnly(u: AuthUser | null) {
  const a = requireAuthUser(u);
  if (a) return a;
  if (u!.role !== 'teacher') {
    return { error: 'Forbidden' as const, status: 403 as const };
  }
  return null;
}

/** Teachers or admins */
export function requireTeacher(u: AuthUser | null) {
  const a = requireAuthUser(u);
  if (a) return a;
  if (u!.role !== 'teacher' && !isAdminRole(u!.role)) {
    return { error: 'Forbidden' as const, status: 403 as const };
  }
  return null;
}

/** Parents or admins viewing as support */
export function requireParent(u: AuthUser | null) {
  const a = requireAuthUser(u);
  if (a) return a;
  if (u!.role !== 'parent' && !isAdminRole(u!.role)) {
    return { error: 'Forbidden' as const, status: 403 as const };
  }
  return null;
}

/** Parent-facing data: only linked students (admins must pass studentId explicitly elsewhere) */
export function requireParentOnly(u: AuthUser | null) {
  const a = requireAuthUser(u);
  if (a) return a;
  if (u!.role !== 'parent') {
    return { error: 'Forbidden' as const, status: 403 as const };
  }
  return null;
}

/** Student portal: exactly one linked student document */
export function requireStudent(u: AuthUser | null) {
  const a = requireAuthUser(u);
  if (a) return a;
  if (u!.role !== 'student') {
    return { error: 'Forbidden' as const, status: 403 as const };
  }
  if (u!.linkedStudentIds?.length !== 1) {
    return { error: 'Forbidden' as const, status: 403 as const };
  }
  return null;
}

export { isAdminRole, JWT_SECRET };
