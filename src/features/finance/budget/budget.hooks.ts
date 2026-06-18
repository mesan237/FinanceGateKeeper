import { useCallback, useEffect, useState } from 'react';

import { currentMonthISO } from '@/utils/formatDate';

import { depositToFund, getOrCreateFunds } from '@/features/finance/funds/funds.service';
import type { Fund } from '@/features/finance/funds/funds.types';
import * as incomeService from '@/features/finance/income/income.service';
import type { Income } from '@/features/finance/income/income.types';
import { contributeManually, getProjects } from '@/features/finance/projects/projects.service';
import type { Project } from '@/features/finance/projects/projects.types';

import * as budgetService from './budget.service';
import { redistributeEmergencyPct } from './budget.service';
import type {
  Allocation,
  AllocationDestination,
  AllocationDraft,
  MonthlyBudget,
  OverBudgetCheck,
} from './budget.types';

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

/**
 * Loads the unallocated income pool (VS-19) and exposes `allocate`, which sends
 * one held income to a chosen destination and flips it to `allocated`. A `fund`
 * destination deposits and, when an emergency deposit first meets the target,
 * triggers redistribution once (mirrors the allocation-screen Confirm flow). A
 * `project` destination records a manual contribution. An `expense` destination
 * deposits nothing — marking the income allocated is what lets it count toward
 * the expense budget. Service errors land in `error` rather than throwing.
 */
export function useUnallocatedPool() {
  const [pending, setPending] = useState<Income[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRows, fundRows, projectRows] = await Promise.all([
        incomeService.getPendingIncome(),
        getOrCreateFunds(),
        getProjects(),
      ]);
      setPending(pendingRows);
      setFunds(fundRows);
      // Only active projects can receive a contribution.
      setProjects(projectRows.filter((p) => p.status === 'active'));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the pool.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allocate = useCallback(
    async (income: Income, destination: AllocationDestination): Promise<void> => {
      try {
        const reason = `Held income ${income.date}`;
        if (destination.kind === 'fund') {
          const result = await depositToFund(destination.fundType, income.amount, reason);
          if (destination.fundType === 'emergency' && result.targetNewlyMet) {
            await redistributeEmergencyPct(currentMonthISO());
          }
        } else if (destination.kind === 'project') {
          await contributeManually(destination.projectId, income.amount);
        }
        await incomeService.markIncomeAllocated(income.id);
        await refresh();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to allocate.');
      }
    },
    [refresh],
  );

  const total = pending.reduce((sum, i) => sum + i.amount, 0);

  return { pending, total, funds, projects, loading, error, allocate, refresh };
}

/**
 * Imperative pre-save guard for the expense screens. Exposes `check(amount)`,
 * which asks the budget service whether logging `amount` this month would
 * exceed the confirmed expense allocation. Not a mount-loading hook — callers
 * run it on demand at save time, with the typed amount. `monthISO` defaults to
 * the current month.
 */
export function useOverBudgetCheck(monthISO?: string) {
  const month = monthISO ?? currentMonthISO();

  const check = useCallback(
    (amount: number): Promise<OverBudgetCheck> => budgetService.checkOverBudget(month, amount),
    [month],
  );

  return { check };
}
