import i18n from 'i18next';

import { costTypeResolver } from '@/features/finance/expenses/expenses.costType';
import { getLoggedDates, monthCoverage } from '@/features/finance/expenses/expenses.coverage';
import {
  getAllCategories,
  getExpensesByDateRange,
} from '@/features/finance/expenses/expenses.service';
import { getIncomeByDateRange } from '@/features/finance/income/income.service';
import { toISODate } from '@/utils/formatDate';
import { firstDayOfMonth, lastDayOfMonth, prevMonthISO } from '@/utils/monthMath';

import type {
  ProfileAverage,
  ProfileCategory,
  ProfileMonth,
  SpendKind,
  SpendingProfile,
} from './reports.types';

/**
 * "Your typical month" (VS-41): what the last few complete months actually
 * cost, split into what is fixed, what is variable, and what was a surprise.
 * The point is behaviour change — fixed costs are commitments, but the variable
 * categories, with their cheapest and dearest month side by side, show where a
 * new habit would pay off.
 */

/** The expense facts the profile needs. */
export interface ProfileExpense {
  /** `YYYY-MM-DD`. */
  date: string;
  amount: number;
  categoryId: number;
  subcategoryId: number | null;
  isRecurring: boolean;
  isUnplanned: boolean;
}

/** Everything {@link buildSpendingProfile} reads; no database, no dates beyond the inputs. */
export interface SpendingProfileInput {
  /** The observation window, oldest first, with each month's coverage. */
  months: ReadonlyArray<ProfileMonth>;
  expenses: ReadonlyArray<ProfileExpense>;
  /** Income rows of the window; averaged over the same complete months (VS-46). */
  incomes?: ReadonlyArray<{ date: string; amount: number }>;
  /** Whether a (category, subcategory) is a fixed or variable cost. */
  kindOf: (categoryId: number, subcategoryId: number | null) => 'fixed' | 'variable';
  labelOf: (categoryId: number) => string;
}

/**
 * How an expense counts: a surprise first (an imprévu is never a habit), then
 * an auto-logged recurring bill as fixed, then its category's tag.
 */
function spendKind(expense: ProfileExpense, input: SpendingProfileInput): SpendKind {
  if (expense.isUnplanned) return 'unexpected';
  if (expense.isRecurring) return 'fixed';
  return input.kindOf(expense.categoryId, expense.subcategoryId);
}

/** Turns per-category, per-month totals into ranked rows over `complete` months. */
function rankCategories(
  byCategory: Map<number, Map<string, number>>,
  complete: ReadonlyArray<string>,
  labelOf: (categoryId: number) => string,
): ProfileCategory[] {
  return [...byCategory.entries()]
    .map(([categoryId, perMonth]) => {
      const amounts = complete.map((m) => perMonth.get(m) ?? 0);
      const sum = amounts.reduce((total, a) => total + a, 0);
      return {
        categoryId,
        categoryLabel: labelOf(categoryId),
        average: Math.round(sum / complete.length),
        lowest: Math.min(...amounts),
        highest: Math.max(...amounts),
      };
    })
    .sort((a, b) => b.average - a.average);
}

/**
 * Builds the typical-month profile. Only complete months count, and every
 * complete month counts — a month without spend in a category is a real zero.
 * Pure.
 */
export function buildSpendingProfile(input: SpendingProfileInput): SpendingProfile {
  const complete = input.months.filter((m) => m.isComplete).map((m) => m.month);
  const empty: SpendingProfile = {
    months: [...input.months],
    average: null,
    incomeAverage: null,
    variableCategories: [],
    fixedCategories: [],
  };
  if (complete.length === 0) return empty;

  const counted = new Set(complete);
  const totals: Record<SpendKind, number> = { fixed: 0, variable: 0, unexpected: 0 };
  const byKind: Record<'fixed' | 'variable', Map<number, Map<string, number>>> = {
    fixed: new Map(),
    variable: new Map(),
  };

  for (const expense of input.expenses) {
    const month = expense.date.slice(0, 7);
    if (!counted.has(month)) continue;
    const kind = spendKind(expense, input);
    totals[kind] += expense.amount;
    if (kind === 'unexpected') continue;
    const perMonth = byKind[kind].get(expense.categoryId) ?? new Map<string, number>();
    perMonth.set(month, (perMonth.get(month) ?? 0) + expense.amount);
    byKind[kind].set(expense.categoryId, perMonth);
  }

  const perMonth = (sum: number) => Math.round(sum / complete.length);
  const fixed = perMonth(totals.fixed);
  const variable = perMonth(totals.variable);
  const unexpected = perMonth(totals.unexpected);
  const average: ProfileAverage = { total: fixed + variable + unexpected, fixed, variable, unexpected };

  return {
    months: [...input.months],
    average,
    incomeAverage: perMonth(
      (input.incomes ?? [])
        .filter((i) => counted.has(i.date.slice(0, 7)))
        .reduce((sum, i) => sum + i.amount, 0),
    ),
    variableCategories: rankCategories(byKind.variable, complete, input.labelOf),
    fixedCategories: rankCategories(byKind.fixed, complete, input.labelOf),
  };
}

/**
 * What the user would keep each month if every variable category cost what it
 * did in its cheapest complete month — a target drawn from their own record,
 * not a generic rule. Fixed costs are left out: they are commitments, not
 * habits. Zero with a single complete month. Pure.
 */
export function habitSavingsPotential(profile: SpendingProfile): number {
  return profile.variableCategories.reduce((sum, c) => sum + Math.max(0, c.average - c.lowest), 0);
}

/**
 * Reads the profile for the `lookback` months before the month of `todayISO`.
 * The current month is never part of it: it is still being lived.
 */
export async function getSpendingProfile(
  todayISO: string = toISODate(new Date()),
  lookback: number = 3,
): Promise<SpendingProfile> {
  const months: string[] = [];
  let cursor = todayISO.slice(0, 7);
  for (let i = 0; i < lookback; i += 1) {
    cursor = prevMonthISO(cursor);
    months.unshift(cursor);
  }
  const from = firstDayOfMonth(months[0]);
  const to = lastDayOfMonth(months[months.length - 1]);

  const [logged, expenses, categories, incomes] = await Promise.all([
    getLoggedDates(from, to),
    getExpensesByDateRange(from, to),
    getAllCategories(),
    getIncomeByDateRange(from, to),
  ]);

  const nameOf = new Map(categories.map((c) => [c.id, c.name]));
  return buildSpendingProfile({
    months: months.map((m) => {
      const { coverage, isComplete } = monthCoverage(m, logged);
      return { month: m, coverage, isComplete };
    }),
    expenses,
    incomes,
    kindOf: costTypeResolver(categories),
    labelOf: (id) => nameOf.get(id) ?? i18n.t('uncategorised', { ns: 'reports' }),
  });
}
