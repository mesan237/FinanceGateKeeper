import i18n from 'i18next';
import { countCompleteMonths } from './budget.baseline';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Category } from '@/features/finance/expenses/expenses.types';
import { track } from '@/services/analytics';
import { prevMonthISO } from '@/utils/monthMath';

import {
  copyBudgetsFromMonth,
  getCategoryBudgets,
  setCategoryBudget,
  setTotalBudget,
} from './budget.envelopes';
import {
  buildMonthlyPlan,
  getBudgetableCategories,
  suggestFromHistory,
} from './budget.plan';
import { getMonthlyBudget } from './budget.service';
import type { MonthlyPlan } from './budget.types';

/**
 * The month-planning form (VS-33).
 *
 * Split out of `budget.hooks.ts` to keep both files inside the 300-line ceiling;
 * this one is a self-contained draft-state machine rather than a thin service
 * wrapper, so it earns its own module.
 *
 * The draft is held as digit strings because that is what `AmountInput` emits;
 * nothing is written until `save()`, so abandoning the screen changes nothing.
 */

/** Amounts are edited as digit-only strings, keyed by category id. */
type AmountDraft = Record<number, string>;
type RolloverDraft = Record<number, boolean>;

/** Reads a digit-string draft value as a number, treating blank as zero. */
function toAmount(value: string | undefined): number {
  return value ? Number(value) : 0;
}

export interface BudgetPlannerState {
  loading: boolean;
  saving: boolean;
  error: string | null;
  /** Top-level categories that can hold an envelope. */
  categories: Category[];
  /** The month total as a digit string; blank means "use the derived total". */
  totalInput: string;
  setTotalInput: (value: string) => void;
  amounts: AmountDraft;
  setAmount: (categoryId: number, value: string) => void;
  rollovers: RolloverDraft;
  toggleRollover: (categoryId: number) => void;
  /** The figure the total follows when none is typed, always offered as a suggestion. */
  derivedTotal: number;
  /** Whether `derivedTotal` is expected income or income received (VS-47). */
  derivedSource: MonthlyPlan['derivedSource'];
  /** The month's total, before goals. */
  totalBudget: number;
  /** What goals take first (VS-49). */
  setAside: number;
  /** `totalBudget - setAside`, never below zero — what the envelopes share. */
  spendable: number;
  assigned: number;
  /** `totalBudget - assigned` — the figure the planner drives to zero. */
  unassigned: number;
  isOverAllocated: boolean;
  /** Per-category averages from recent months; empty with no history. */
  suggestions: Map<number, number>;
  /** Complete months behind the averages; under three reads as provisional (VS-46). */
  averageMonths: number;
  applySuggestions: () => void;
  copyFromLastMonth: () => Promise<void>;
  useDerivedTotal: () => void;
  distributeRemainder: (categoryId: number) => void;
  save: () => Promise<boolean>;
}

/**
 * Drives the budget planner for `monthISO`: loads the categories, any existing
 * envelopes, the derived total, and history-based suggestions, then holds the
 * whole plan as local draft state until saved.
 */
export function useBudgetPlanner(monthISO: string): BudgetPlannerState {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalInput, setTotalInput] = useState('');
  const [amounts, setAmounts] = useState<AmountDraft>({});
  const [rollovers, setRollovers] = useState<RolloverDraft>({});
  const [derivedTotal, setDerivedTotal] = useState(0);
  const [derivedSource, setDerivedSource] = useState<MonthlyPlan['derivedSource']>('received');
  const [setAside, setSetAside] = useState(0);
  const [suggestions, setSuggestions] = useState<Map<number, number>>(new Map());
  const [averageMonths, setAverageMonths] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const monthly = await getMonthlyBudget(monthISO);
        const [cats, budgets, plan, suggested, completeMonths] = await Promise.all([
          getBudgetableCategories(),
          getCategoryBudgets(monthISO),
          buildMonthlyPlan(monthISO, monthly.incomeTotal),
          suggestFromHistory(monthISO),
          countCompleteMonths(monthISO),
        ]);
        if (!active) return;
        setAverageMonths(completeMonths);

        setCategories(cats);
        setDerivedTotal(plan.derivedTotal);
        setDerivedSource(plan.derivedSource);
        setSetAside(plan.setAside);
        // Blank when the total is inherited, so the field shows the derived
        // figure as a placeholder rather than pretending the user typed it.
        setTotalInput(plan.isExplicit ? String(plan.totalBudget) : '');
        setAmounts(
          Object.fromEntries(
            budgets.filter((b) => b.allocatedAmount > 0).map((b) => [b.categoryId, String(b.allocatedAmount)]),
          ),
        );
        setRollovers(
          Object.fromEntries(budgets.map((b) => [b.categoryId, b.rolloverEnabled])),
        );
        setSuggestions(suggested);
        setError(null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : i18n.t('errors.loadPlanner', { ns: 'budget' }));
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [monthISO]);

  const totalBudget = totalInput ? Number(totalInput) : derivedTotal;
  // Pay yourself first (VS-49): the envelopes share what the goals leave.
  const spendable = Math.max(0, totalBudget - setAside);

  const assigned = useMemo(
    () => Object.values(amounts).reduce((sum, value) => sum + toAmount(value), 0),
    [amounts],
  );

  const setAmount = useCallback((categoryId: number, value: string) => {
    setAmounts((prev) => ({ ...prev, [categoryId]: value.replace(/\D/g, '') }));
  }, []);

  const toggleRollover = useCallback((categoryId: number) => {
    setRollovers((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  const applySuggestions = useCallback(() => {
    setAmounts((prev) => {
      const next = { ...prev };
      for (const [categoryId, amount] of suggestions) next[categoryId] = String(amount);
      return next;
    });
  }, [suggestions]);

  const useDerivedTotal = useCallback(() => setTotalInput(''), []);

  /** Drops the entire unassigned remainder into one envelope — the last tap to zero. */
  const distributeRemainder = useCallback(
    (categoryId: number) => {
      setAmounts((prev) => {
        const currentAssigned = Object.values(prev).reduce((s, v) => s + toAmount(v), 0);
        const remainder = spendable - currentAssigned;
        if (remainder <= 0) return prev;
        return { ...prev, [categoryId]: String(toAmount(prev[categoryId]) + remainder) };
      });
    },
    [spendable],
  );

  const copyFromLastMonth = useCallback(async () => {
    try {
      const previous = prevMonthISO(monthISO);
      const budgets = await getCategoryBudgets(previous);
      setAmounts(
        Object.fromEntries(
          budgets.filter((b) => b.allocatedAmount > 0).map((b) => [b.categoryId, String(b.allocatedAmount)]),
        ),
      );
      setRollovers(Object.fromEntries(budgets.map((b) => [b.categoryId, b.rolloverEnabled])));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.copyLastMonth', { ns: 'budget' }));
    }
  }, [monthISO]);

  /**
   * Persists the draft. A blank total clears the explicit override so the month
   * returns to the income-split figure. Every listed category is written —
   * including zeros — so clearing a field actually empties that envelope rather
   * than silently leaving the old amount behind.
   */
  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    try {
      await setTotalBudget(monthISO, totalInput ? Number(totalInput) : null);
      for (const category of categories) {
        const amount = toAmount(amounts[category.id]);
        await setCategoryBudget(monthISO, category.id, amount, rollovers[category.id] ?? false);
      }
      track('budget_adjustment_completed', { entry_point: 'planner', action_type: 'save_plan' });
      setError(null);
      return true;
    } catch (e) {
      track('operation_failed', { feature_name: 'budget', action_type: 'adjust', failure_reason_code: 'save_error' });
      setError(e instanceof Error ? e.message : i18n.t('errors.saveBudget', { ns: 'budget' }));
      return false;
    } finally {
      setSaving(false);
    }
  }, [monthISO, totalInput, categories, amounts, rollovers]);

  return {
    loading,
    saving,
    error,
    categories,
    totalInput,
    setTotalInput,
    amounts,
    setAmount,
    rollovers,
    toggleRollover,
    derivedTotal,
    derivedSource,
    totalBudget,
    setAside,
    spendable,
    assigned,
    unassigned: spendable - assigned,
    isOverAllocated: assigned > spendable,
    suggestions,
    averageMonths,
    applySuggestions,
    copyFromLastMonth,
    useDerivedTotal,
    distributeRemainder,
    save,
  };
}

// `copyBudgetsFromMonth` is re-exported for callers that want the direct write
// (the planner uses the draft-state path above so the copy stays undoable until
// the user saves).
export { copyBudgetsFromMonth };
