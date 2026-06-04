import { useCallback, useEffect, useState } from 'react';

import * as budgetService from './budget.service';
import type { Allocation, AllocationDraft, MonthlyBudget } from './budget.types';

/**
 * Loads (and auto-creates on first call) the allocation for `monthISO` and
 * exposes save/lock/refresh actions. `save` and `lock` swallow service errors
 * into the `error` field rather than re-throwing into the UI, mirroring how
 * `useIncomeLog` handles `createIncome` failures.
 */
export function useAllocation(monthISO: string) {
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const row = await budgetService.getOrCreateCurrentAllocation(monthISO);
      setAllocation(row);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load allocation.');
    } finally {
      setLoading(false);
    }
  }, [monthISO]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (draft: AllocationDraft): Promise<void> => {
      try {
        await budgetService.updateAllocation(monthISO, draft);
        const fresh = await budgetService.getAllocation(monthISO);
        if (fresh) setAllocation(fresh);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save allocation.');
      }
    },
    [monthISO],
  );

  const lock = useCallback(async (): Promise<void> => {
    try {
      await budgetService.lockAllocation(monthISO);
      const fresh = await budgetService.getAllocation(monthISO);
      if (fresh) setAllocation(fresh);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to lock allocation.');
    }
  }, [monthISO]);

  return { allocation, loading, error, save, lock, refresh };
}

/**
 * Loads the composed `MonthlyBudget` for `monthISO`. `refresh()` is
 * caller-driven — the Budget tab calls it on focus and screens that log
 * income/expenses call it after a successful save.
 */
export function useBudgetStatus(monthISO: string) {
  const [budget, setBudget] = useState<MonthlyBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await budgetService.getMonthlyBudget(monthISO);
      setBudget(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load budget.');
    } finally {
      setLoading(false);
    }
  }, [monthISO]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { budget, loading, error, refresh };
}
