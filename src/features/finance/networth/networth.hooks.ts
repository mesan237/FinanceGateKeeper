import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toISODate } from '@/utils/formatDate';

import { getMonthFlows, getNetWorthAsOf, savingsRate } from './networth.compute';
import { closeMonths, getSnapshots, recalculateMonth } from './networth.snapshots';
import type { MonthSnapshot, NetWorth } from './networth.types';

/** Message of a thrown error, else the localised fallback `key`. */
function messageOf(e: unknown, key: 'load' | 'recalculate'): string {
  return e instanceof Error ? e.message : i18n.t(`errors.${key}`, { ns: 'networth' });
}

/**
 * Today's net worth, this month's savings rate so far, and the stored
 * month-end history (VS-53). `refresh` is caller-driven (re-read on focus).
 */
export function useNetWorth() {
  const [now, setNow] = useState<NetWorth | null>(null);
  const [thisMonthRate, setThisMonthRate] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<MonthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const today = toISODate(new Date());
      const [worth, flows, history] = await Promise.all([
        getNetWorthAsOf(today),
        getMonthFlows(today.slice(0, 7)),
        getSnapshots(),
      ]);
      setNow(worth);
      setThisMonthRate(savingsRate(flows.income, flows.spending));
      setSnapshots(history);
      setError(null);
    } catch (e) {
      setError(messageOf(e, 'load'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { now, thisMonthRate, snapshots, loading, error, refresh };
}

/** The stored month-end history and a deliberate per-month recalculation. */
export function useNetWorthHistory() {
  const [snapshots, setSnapshots] = useState<MonthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSnapshots(await getSnapshots());
      setError(null);
    } catch (e) {
      setError(messageOf(e, 'load'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Re-takes `monthISO` from today's data; resolves true when it landed. */
  const recalculate = useCallback(
    async (monthISO: string): Promise<boolean> => {
      try {
        await recalculateMonth(monthISO);
        await refresh();
        return true;
      } catch (e) {
        setError(messageOf(e, 'recalculate'));
        return false;
      }
    },
    [refresh],
  );

  return { snapshots, loading, error, refresh, recalculate };
}

/**
 * Snapshots every closed month that has none yet — on mount, and whenever the
 * app returns to the foreground, since a month may have closed meanwhile.
 * Failures are swallowed: history is a convenience, never a gate.
 */
export function useMonthCloser(): void {
  useEffect(() => {
    const run = () => {
      closeMonths().catch(() => undefined);
    };
    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => subscription.remove();
  }, []);
}
