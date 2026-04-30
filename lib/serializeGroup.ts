import type { UserRole } from '@/models/User';
import { isAdminRole } from '@/models/User';

/** Talaba/ota-ona uchun yashirin; ustoz uchun guruh tushumi yashirin. */
export function serializeGroupForClient(g: Record<string, unknown>, role: UserRole | string | undefined) {
  const o = { ...g } as Record<string, unknown>;
  if (isAdminRole(role as any)) {
    return o;
  }
  if (role === 'teacher') {
    delete o.price;
    delete o.teacherSharePercent;
    delete o.teacherPayoutFixed;
    o.revenueHidden = true;
  }
  return o;
}
