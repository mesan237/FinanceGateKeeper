import React, { useEffect, useState } from 'react';

import { shouldTriggerZeroDay } from '@/notifications/triggers/zeroDayCheck';
import { toISODate } from '@/utils/formatDate';

import { ZeroDayPrompt } from './ZeroDayPrompt';
import { confirmZeroDay, getDayActivityStatus } from './expenses.service';

export interface ZeroDayGateProps {
  /** Daily reminder time as `HH:mm`; the prompt only appears after this. */
  reminderTime: string;
  /** When false, the gate never prompts. */
  notificationsEnabled: boolean;
  /** Reference "now" (default: current time). Injectable for tests. */
  now?: Date;
  children: React.ReactNode;
}

/** Whether `now` (local) is at or past the `HH:mm` reminder time. */
function isPastReminderTime(now: Date, reminderTime: string): boolean {
  const [hour, minute] = reminderTime.split(':').map(Number);
  return now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute;
}

/**
 * App-root wrapper that shows the zero-day prompt when, on app open, the
 * reminder time has passed and today has neither a logged expense nor a
 * confirmation. Decides in-app rather than at OS-fire time (a scheduled
 * notification can't query the DB). Reminder settings arrive as props from the
 * root layout, so this expenses component never imports the auth feature.
 * Errors are swallowed so a DB hiccup never blocks the app.
 */
export function ZeroDayGate({ reminderTime, notificationsEnabled, now, children }: ZeroDayGateProps) {
  const [visible, setVisible] = useState(false);

  // The day the gate evaluates and confirms against — today in production,
  // the injected `now` in tests. Both the status read and the confirm use it
  // so they can never disagree on which day is being judged.
  const day = toISODate(now ?? new Date());

  useEffect(() => {
    void (async () => {
      try {
        if (!notificationsEnabled) return;
        if (!isPastReminderTime(now ?? new Date(), reminderTime)) return;
        const status = await getDayActivityStatus(day);
        if (
          shouldTriggerZeroDay({
            hasExpensesToday: status.hasExpenses,
            zeroDayConfirmed: status.zeroDayConfirmed,
          })
        ) {
          setVisible(true);
        }
      } catch (e) {
        console.error('Zero-day gate check failed:', e);
      }
    })();
  }, [reminderTime, notificationsEnabled, now, day]);

  const handleConfirm = async () => {
    try {
      await confirmZeroDay(day);
    } finally {
      setVisible(false);
    }
  };

  return (
    <>
      {children}
      <ZeroDayPrompt
        visible={visible}
        onConfirm={handleConfirm}
        onClose={() => setVisible(false)}
      />
    </>
  );
}
