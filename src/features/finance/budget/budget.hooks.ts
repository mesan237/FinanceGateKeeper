import { useCallback, useEffect, useState } from 'react';

import { currentMonthISO } from '@/utils/formatDate';

import { checkOverBudget } from './budget.plan';
import * as budgetService from './budget.service';
import type { MonthlyBudget, OverBudgetCheck } from './budget.types';

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

/**
 * Imperative pre-save guard for the expense screens. Exposes `check(amount)`,
 * which asks the budget service whether logging `amount` this month would
 * exceed the month's spending budget. Not a mount-loading hook — callers
 * run it on demand at save time, with the typed amount. `monthISO` defaults to
 * the current month.
 */
export function useOverBudgetCheck(monthISO?: string) {
  const month = monthISO ?? currentMonthISO();

  const check = useCallback(
    (amount: number): Promise<OverBudgetCheck> => checkOverBudget(month, amount),
    [month],
  );

  return { check };
}
