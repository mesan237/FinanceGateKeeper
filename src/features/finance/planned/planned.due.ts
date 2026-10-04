import { toISODate } from '@/utils/formatDate';

/** How many days ahead of its date an item starts asking for attention. */
export const DUE_SOON_DAYS = 3;

/**
 * Where an open item stands against its date:
 * `overdue` (the day has passed), `today`, `soon` (within `DUE_SOON_DAYS`)
 * or `later`.
 */
export type DueStatus = 'overdue' | 'today' | 'soon' | 'later';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight UTC of a `YYYY-MM-DD` date, so day arithmetic ignores time zones. */
function utcDay(dateISO: string): number {
  return Date.parse(`${dateISO}T00:00:00Z`);
}

/**
 * Today as `YYYY-MM-DD`, the reference every due status is measured against.
 * One seam, so tests can pin the day.
 */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Whole calendar days from `todayISO` to `dateISO`; negative once it has passed. */
export function daysUntil(dateISO: string, todayISO: string): number {
  return Math.round((utcDay(dateISO) - utcDay(todayISO)) / DAY_MS);
}

/** Classifies a due date against today. Pure. */
export function dueStatus(dateISO: string, todayISO: string): DueStatus {
  const days = daysUntil(dateISO, todayISO);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= DUE_SOON_DAYS) return 'soon';
  return 'later';
}

/** Whether a status should raise the dot, the dashboard line and the badge. */
export function needsAttention(status: DueStatus): boolean {
  return status !== 'later';
}

/**
 * The date an item is due: its own `plannedDate` when set, otherwise its list's
 * due date. Null only for an undated item on a list made before due dates.
 */
export function effectiveDueDate(itemDate: string | null, listDate: string | null): string | null {
  return itemDate ?? listDate;
}

/**
 * The new date after postponing by `days`. Counts from the current date while
 * it is still ahead, and from today once it has passed, so postponing an
 * overdue item always lands in the future.
 */
export function postponedDate(currentISO: string, todayISO: string, days: number): string {
  const base = Math.max(utcDay(currentISO), utcDay(todayISO));
  return toISODate(new Date(base + days * DAY_MS));
}
