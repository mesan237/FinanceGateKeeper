import type { AttentionCounts } from '@/components/AttentionProvider';
import {
  cancelNotification,
  getScheduledNotifications,
  scheduleNotification,
} from '@/notifications/notifications.service';
import { buildTontineDueAlert, type TontineDueInput } from '@/notifications/triggers/tontineDue';
import { daysBetween, toISODate } from '@/utils/formatDate';

import { getDueContributions } from './tontines.due';
import { DUE_SOON_DAYS } from './tontines.schedule';
import type { DueContribution } from './tontines.types';

/** The hour of day tontine reminders are delivered, local time. */
const REMINDER_HOUR = 9;

/** 09:00 local time on a `YYYY-MM-DD` day. */
function morningOf(dateISO: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(year, month - 1, day, REMINDER_HOUR, 0);
}

/** `dateISO` shifted by `days` (UTC day arithmetic). */
function shift(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toISODate(date);
}

/**
 * Which tontine reminders to schedule (VS-52). Per tontine:
 *
 * - its overdue contributions share one nudge at the next 09:00 — re-planned on
 *   every app open, so it repeats daily until they are paid;
 * - its next contribution still ahead gets a heads-up at 09:00 `DUE_SOON_DAYS`
 *   before (while that is still ahead) and a reminder at 09:00 on the day.
 *
 * Later cycles wait their turn: they are planned once they become the next one.
 * Pure; `now` is explicit for testing.
 */
export function planTontineReminders(due: ReadonlyArray<DueContribution>, now: Date): TontineDueInput[] {
  const today = toISODate(now);
  const byTontine = new Map<number, DueContribution[]>();
  for (const item of due) byTontine.set(item.tontineId, [...(byTontine.get(item.tontineId) ?? []), item]);

  const plans: TontineDueInput[] = [];
  for (const items of byTontine.values()) {
    const overdue = items.filter((i) => i.dueDate < today);
    if (overdue.length > 0) {
      const nextMorning = morningOf(today) > now ? today : shift(today, 1);
      plans.push({
        tontineName: overdue[0].tontineName,
        count: overdue.length,
        amount: overdue.reduce((sum, i) => sum + i.amount, 0),
        dueDate: overdue[0].dueDate,
        kind: 'overdue',
        scheduledAt: morningOf(nextMorning),
      });
    }

    const next = items.find((i) => i.dueDate >= today);
    if (!next) continue;
    const base = { tontineName: next.tontineName, count: 1, amount: next.amount, dueDate: next.dueDate };
    const headsUp = morningOf(shift(next.dueDate, -DUE_SOON_DAYS));
    if (headsUp > now) plans.push({ ...base, kind: 'soon', scheduledAt: headsUp });
    const onTheDay = morningOf(next.dueDate);
    if (onTheDay > now) plans.push({ ...base, kind: 'today', scheduledAt: onTheDay });
  }
  return plans;
}

/**
 * What needs the user's attention today: overdue contributions, and those due
 * from today to `DUE_SOON_DAYS` ahead. Pure.
 */
export function countTontineAttention(due: ReadonlyArray<DueContribution>, todayISO: string): AttentionCounts {
  let soon = 0;
  let overdue = 0;
  for (const item of due) {
    const days = daysBetween(todayISO, item.dueDate);
    if (days < 0) overdue += 1;
    else if (days <= DUE_SOON_DAYS) soon += 1;
  }
  return { soon, overdue };
}

/** Cancels every tontine reminder scheduled earlier; other reminders stay. */
async function cancelTontineReminders(): Promise<void> {
  const scheduled = await getScheduledNotifications();
  await Promise.all(
    scheduled
      .filter((n) => n.content?.data?.type === 'tontineDue')
      .map((n) => cancelNotification(n.identifier)),
  );
}

/**
 * Re-plans every tontine reminder from the current schedules — cancel, then
 * schedule fresh, so a paid or moved contribution never leaves a stale one —
 * and returns what needs attention now.
 */
export async function reconcileTontineReminders(now: Date = new Date()): Promise<AttentionCounts> {
  const due = await getDueContributions();
  await cancelTontineReminders();
  for (const plan of planTontineReminders(due, now)) {
    await scheduleNotification(buildTontineDueAlert(plan));
  }
  return countTontineAttention(due, toISODate(now));
}
