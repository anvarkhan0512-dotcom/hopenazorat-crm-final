/** Yil boshidan boshlab 7 kunlik bloklar bo‘yicha hafta indeksi (toq/juft filtri uchun) */
export function simpleWeekIndexFromYearStart(d: Date): number {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  day.setHours(12, 0, 0, 0);
  const start = new Date(day.getFullYear(), 0, 1);
  start.setHours(12, 0, 0, 0);
  const diff = Math.floor((day.getTime() - start.getTime()) / 86400000);
  return Math.floor(diff / 7);
}

export type WeekParityFilter = 'all' | 'odd' | 'even';

export function weekdaysFromGroupSchedule(
  weeklySchedule: { day: number }[] | undefined | null
): number[] {
  if (!weeklySchedule?.length) return [1, 2, 3, 4, 5];
  const u = Array.from(new Set(weeklySchedule.map((s) => s.day))).filter((d) => d >= 0 && d <= 6);
  return u.length ? u.sort((a, b) => a - b) : [1, 2, 3, 4, 5];
}

function weekAllowed(d: Date, parity: WeekParityFilter): boolean {
  if (parity === 'all') return true;
  const w = simpleWeekIndexFromYearStart(d);
  return parity === 'odd' ? w % 2 === 1 : w % 2 === 0;
}

/**
 * `periodStart` dan boshlab, faqat `weekdays` kunlarida va (ixtiyoriy) ISO hafta toq/juft
 * filtrida `lessonCount` ta dars sanasini sanab, oxirgi dars sanasini qaytaradi.
 */
export function computePeriodEndFromLessons(
  periodStart: Date,
  lessonCount: number,
  weeklySchedule: { day: number }[] | undefined | null,
  weekParity: WeekParityFilter = 'all'
): Date {
  const n = Math.min(52, Math.max(1, Math.floor(lessonCount)));
  const weekdays = new Set(weekdaysFromGroupSchedule(weeklySchedule));
  const start = new Date(periodStart);
  start.setHours(12, 0, 0, 0);

  let d = new Date(start);
  let guard = 0;
  while (guard < 800) {
    if (weekdays.has(d.getDay()) && weekAllowed(d, weekParity)) {
      break;
    }
    d.setDate(d.getDate() + 1);
    guard++;
  }

  let counted = 1;
  const end = new Date(d);
  while (counted < n && guard < 800) {
    d.setDate(d.getDate() + 1);
    guard++;
    if (weekdays.has(d.getDay()) && weekAllowed(d, weekParity)) {
      counted++;
      end.setTime(d.getTime());
    }
  }
  end.setHours(12, 0, 0, 0);
  return end;
}
