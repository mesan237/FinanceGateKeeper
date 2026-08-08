import { useCallback, useEffect, useState } from 'react';

import { currentMonthISO } from '@/utils/formatDate';

import { moveBudget, removeCategoryBudget, setCategoryBudget } from './budget.envelopes';
import { checkCategoryBudget, getBudgetOverview } from './budget.plan';
import type { BudgetOverview, CategoryBudgetCheck } from './budget.types';

/**
 * Hooks over the per-category envelopes (VS-33) — reading the Budget tab's
 * composed view, writing a single envelope, and the per-category pre-save guard.
 *
 * Separate from `budget.hooks.ts` (the income-split hooks) so both files stay
 * inside the 300-line ceiling; the planner's larger draft-state machine lives in
 * `budget.planner.hooks.ts`.
 */

/**
 * Loads the composed `BudgetOverview` for `monthISO` — plan, envelopes, and
 * month-level pace.
 *
 * `refresh` is caller-driven so the Budget tab can re-read on focus. Expenses
 * are logged from other screens entirely, so a view that only loaded on mount
 * goes stale the moment the user logs something and navigates back — which is
 * exactly what the pre-VS-33 Budget tab did.
 */
export function useBudgetOverview(monthISO: string) {
  const [overview, setOverview] = useState<BudgetOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getBudgetOverview(monthISO);
      setOverview(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the budget.');
    } finally {
      setLoading(false);
    }
  }, [monthISO]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  return { overview, loading, error, refresh };
}

/**
 * Write actions for one envelope, backing the edit sheet: set its amount and
 * rollover flag, delete it, or cover an overspend by moving budget in from
 * another category.
 *
 * Errors land in `error` rather than throwing into the UI (mirroring
 * `useAllocation`), and each action resolves `true` only when the write landed —
 * so a sheet closes on success and stays open, showing the reason, on failure.
 */
export function useEnvelopeActions(monthISO: string) {
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    try {
      await action();
      setError(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update the budget.');
      return false;
    }
  }, []);

  const setBudget = useCallback(
    (categoryId: number, amount: number, rolloverEnabled?: boolean) =>
      run(() => setCategoryBudget(monthISO, categoryId, amount, rolloverEnabled)),
    [monthISO, run],
  );

  const remove = useCallback(
    (categoryId: number) => run(() => removeCategoryBudget(monthISO, categoryId)),
    [monthISO, run],
  );

  const coverFrom = useCallback(
    (fromCategoryId: number, toCategoryId: number, amount: number) =>
      run(() => moveBudget(monthISO, fromCategoryId, toCategoryId, amount)),
    [monthISO, run],
  );

  return { setBudget, remove, coverFrom, error };
}

/**
 * Imperative per-category guard for the expense screens. Exposes
 * `check(categoryId, amount)`, which reports whether logging `amount` would push
 * that category past its envelope.
 *
 * Unlike `useOverBudgetCheck` this binds the moment an envelope exists — it does
 * not wait for the month's income split to be locked, because a category budget
 * is a number the user typed on purpose. `monthISO` defaults to the current month.
 */
export function useCategoryOverBudgetCheck(monthISO?: string) {
  const month = monthISO ?? currentMonthISO();

  const check = useCallback(
    (categoryId: number, amount: number): Promise<CategoryBudgetCheck> =>
      checkCategoryBudget(month, categoryId, amount),
    [month],
  );

  return { check };
}
