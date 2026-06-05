import { useCallback, useEffect, useState } from 'react';

import {
  cancelNotification,
  getScheduledNotifications,
  scheduleNotification,
} from '@/notifications/notifications.service';
import { buildDebtDueAlert } from '@/notifications/triggers/debtDueDate';

import * as debtService from './debt.service';
import type { Debt, DebtDirection, DebtPatch, DebtReminder, OutstandingTotals } from './debt.types';

const EMPTY_TOTALS: OutstandingTotals = { lent: 0, owed: 0 };

/**
 * Loads one direction's debts plus the outstanding totals, and exposes
 * `settle`/`remove` mutations that re-fetch on success. Errors are swallowed
 * into `error`, mirroring the other slices' hooks.
 */
export function useDebts(direction: DebtDirection) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [totals, setTotals] = useState<OutstandingTotals>(EMPTY_TOTALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, outstanding] = await Promise.all([
        debtService.getDebts(direction),
        debtService.getOutstandingTotals(),
      ]);
      setDebts(rows);
      setTotals(outstanding);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load debts.');
    } finally {
      setLoading(false);
    }
  }, [direction]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const settle = useCallback(
    async (id: number): Promise<void> => {
      try {
        await debtService.settleDebt(id);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to settle debt.');
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      try {
        await debtService.deleteDebt(id);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete debt.');
      }
    },
    [refresh],
  );

  return { debts, totals, loading, error, refresh, settle, remove };
}

/**
 * Loads a single debt and exposes `settle`/`update`/`remove` mutations that
 * re-fetch on success.
 */
export function useDebtDetail(id: number) {
  const [debt, setDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDebt(await debtService.getDebtById(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load debt.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const settle = useCallback(async (): Promise<void> => {
    try {
      await debtService.settleDebt(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to settle debt.');
    }
  }, [id, refresh]);

  const update = useCallback(
    async (patch: DebtPatch): Promise<void> => {
      try {
        await debtService.updateDebt(id, patch);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update debt.');
      }
    },
    [id, refresh],
  );

  const remove = useCallback(async (): Promise<void> => {
    try {
      await debtService.deleteDebt(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete debt.');
    }
  }, [id]);

  return { debt, loading, error, refresh, settle, update, remove };
}

/** Cancels every previously scheduled debt due-date notification. */
async function cancelExistingDebtReminders(): Promise<void> {
  const scheduled = await getScheduledNotifications();
  await Promise.all(
    scheduled
      .filter((n) => n.content?.data?.type === 'debtDueDate')
      .map((n) => cancelNotification(n.identifier)),
  );
}

/**
 * On mount, reconciles debt due-date reminders: cancels any previously
 * scheduled debt reminders, then reads the pending debts in their reminder
 * window and schedules a fresh notification for each. Cancel-then-schedule
 * (mirroring `applyReminderSchedule`) stops day-over-day reopens from stacking
 * duplicate notifications for the same debt. Mounted once at the app root via
 * `DebtReminderScheduler`, so this runs on every app open — the approved
 * on-open delivery model. The returned list lets a future dashboard badge reuse
 * it. Errors are swallowed into `error`.
 */
export function useDebtReminders() {
  const [reminders, setReminders] = useState<DebtReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const due = await debtService.getDueReminders();
        if (cancelled) return;
        setReminders(due);
        await cancelExistingDebtReminders();
        for (const reminder of due) {
          await scheduleNotification(buildDebtDueAlert(reminder));
        }
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to schedule reminders.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { reminders, loading, error };
}
