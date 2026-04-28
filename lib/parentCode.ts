import crypto from 'crypto';
import { Student } from '@/models/Student';

/** 8-char uppercase code for parent linking (not cryptographically unique for high security—ID in admin + code is the link). */
export function generateParentAccessCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function ensureUniqueParentCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = generateParentAccessCode();
    const exists = await Student.findOne({ parentAccessCode: code });
    if (!exists) return code;
  }
  return generateParentAccessCode() + Date.now().toString(36).toUpperCase();
}
