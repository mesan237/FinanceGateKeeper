import {
  cancelNotification,
  getScheduledNotifications,
  scheduleNotification,
} from '@/notifications/notifications.service';
import { buildPlannedDueAlert, type PlannedDueInput } from '@/notifications/triggers/plannedDue';
import { toISODate } from '@/utils/formatDate';

import { DUE_SOON_DAYS, daysUntil, postponedDate } from './planned.due';
import { countAttention, getDueItems } from './planned.dueItems';
import type { DueItem, PlannedAttention } from './planned.types';

/** The hour of day planned-purchase reminders are delivered, local time. */
const REMINDER_HOUR = 9;

/** 09:00 local time on a `YYYY-MM-DD` day. */
function morningOf(dateISO: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(year, month - 1, day, REMINDER_HOUR, 0);
}

/**
 * Works out which reminders to schedule for the items still to buy. Items a
 * list has due on the same day share one reminder. For each such group:
 *
 * - a heads-up at 09:00, `DUE_SOON_DAYS` before the day, while that is still ahead;
 * - a reminder at 09:00 on the day (today's only if 09:00 has not passed yet);
 * - once the day has passed, a nudge at the next 09:00 — re-planned on every
 *   app open, so it repeats daily until the items are bought or postponed.
 *
 * Pure; `now` is explicit for testing.
 */
export function planReminders(items: DueItem[], now: Date): PlannedDueInput[] {
  const today = toISODate(now);
  const groups = new Map<string, PlannedDueInput>();
  for (const item of items) {
    const key = `${item.listId}|${item.dueDate}`;
    const group = groups.get(key);
    if (group) {
      group.count += 1;
      group.total += item.estimatedAmount;
    } else {
      groups.set(key, {
        listName: item.listName,
        count: 1,
        total: item.estimatedAmount,
        dueDate: item.dueDate,
        kind: 'soon',
        scheduledAt: now,
      });
    }
  }

  const plans: PlannedDueInput[] = [];
  for (const group of groups.values()) {
    const days = daysUntil(group.dueDate, today);
    if (days < 0) {
      const nextMorning = morningOf(today) > now ? today : postponedDate(today, today, 1);
      plans.push({ ...group, kind: 'overdue', scheduledAt: morningOf(nextMorning) });
      continue;
    }
    if (days > DUE_SOON_DAYS) {
      const headsUp = postponedDate(group.dueDate, group.dueDate, -DUE_SOON_DAYS);
      plans.push({ ...group, kind: 'soon', scheduledAt: morningOf(headsUp) });
    }
    const onTheDay = morningOf(group.dueDate);
    if (onTheDay > now) plans.push({ ...group, kind: 'today', scheduledAt: onTheDay });
  }
  return plans;
}

/** Cancels every planned-purchase reminder scheduled earlier; others stay. */
async function cancelPlannedReminders(): Promise<void> {
  const scheduled = await getScheduledNotifications();
  await Promise.all(
    scheduled
      .filter((n) => n.content?.data?.type === 'plannedDue')
      .map((n) => cancelNotification(n.identifier)),
  );
}

/**
 * Re-plans every planned-purchase reminder from the current lists — cancel,
 * then schedule fresh, so moved dates and bought items never leave a stale
 * notification behind — and returns how many items need attention now.
 */
export async function reconcilePlannedReminders(now: Date = new Date()): Promise<PlannedAttention> {
  const items = await getDueItems();
  await cancelPlannedReminders();
  for (const plan of planReminders(items, now)) {
    await scheduleNotification(buildPlannedDueAlert(plan));
  }
  return countAttention(items, toISODate(now));
}
