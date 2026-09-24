import { execute, query } from '@/services/database';

import type { MonthlyBudget } from './budget.types';

/**
 * Month-level budget figures: the income the month brought in, what has been
 * spent against it, and the row that carries the explicit total.
 *
 * The four-bucket income split this module used to own (percentages, the month
 * lock, `calculateBreakdown`, emergency redistribution) was parked in VS-34.
 * What survives is the part the daily loop needs: how much came in, how much
 * went out. The per-category envelopes live in `budget.envelopes.ts`, and
 * `budget.plan.ts` composes the two.
 */

/**
 * `allocations` still has four NOT NULL percentage columns from the parked
 * split. Nothing reads them; they are filled once on insert so the row carrying
 * `total_budget` can exist at all. Keeping the columns instead of migrating them
 * away is deliberate — a schema change would invalidate every existing export
 * file, and an unread column costs nothing.
 */
const VESTIGIAL_SPLIT = {
  emergencyFundPct: 0,
  savingsPct: 0,
  projectsPct: 0,
  expensesPct: 100,
  priorityOrder: '[]',
};

/**
 * Ensures the `allocations` row for `monthISO` exists, so `setTotalBudget` has
 * something to UPDATE. Idempotent: `INSERT OR IGNORE` against the
 * `UNIQUE(month)` constraint makes a second call a no-op, and race-safe.
 */
export async function ensureMonthRow(monthISO: string): Promise<void> {
  await execute(
    `INSERT OR IGNORE INTO allocations
       (month, emergency_fund_pct, savings_pct, projects_pct, expenses_pct,
        priority_order, is_locked, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      monthISO,
      VESTIGIAL_SPLIT.emergencyFundPct,
      VESTIGIAL_SPLIT.savingsPct,
      VESTIGIAL_SPLIT.projectsPct,
      VESTIGIAL_SPLIT.expensesPct,
      VESTIGIAL_SPLIT.priorityOrder,
      new Date().toISOString(),
    ],
  );
}

/**
 * Sums `amount` across every expense whose `date` falls in `monthISO`
 * (`"YYYY-MM"`). The `date LIKE 'YYYY-MM-%'` predicate uses the index on
 * `expenses.date`. Lives in `budget.service` rather than `expenses.service`
 * because the budget feature is the consumer (see the approved cross-feature
 * dep `budget → expenses`).
 */
export async function getExpensesMonthlyTotal(monthISO: string): Promise<number> {
  const [row] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE date LIKE ?`,
    [`${monthISO}-%`],
  );
  return row.total;
}

/**
 * Sums `amount` across every income row whose `date` falls in `monthISO`.
 *
 * This used to count only `allocated` rows, excluding income held in the VS-19
 * unallocated pool. With the pool gone (VS-34) nothing holds a row back, so the
 * filter is dropped — and dropping it also stops legacy `pending` rows from
 * silently under-reporting a past month. The query reads the income table
 * directly rather than importing `income.service`, so `budget` does not
 * cross-import `income` as a module — mirroring `getExpensesMonthlyTotal`.
 */
export async function getIncomeMonthlyTotal(monthISO: string): Promise<number> {
  const [row] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM income WHERE date LIKE ?`,
    [`${monthISO}-%`],
  );
  return row.total;
}

/**
 * Composes the month's headline figures: income in, expenses out, and what is
 * left of the income.
 *
 * `incomeTotal` is also the month's **derived** budget — the figure used when
 * the user has not set an explicit total. Before VS-34 the derived figure was
 * `income × expenses_pct`; with no split there is no percentage to apply, so the
 * whole month's income is the honest default. An explicit `allocations.total_budget`
 * still overrides it, resolved in `budget.plan.buildMonthlyPlan`.
 */
export async function getMonthlyBudget(monthISO: string): Promise<MonthlyBudget> {
  const [incomeTotal, expensesLogged] = await Promise.all([
    getIncomeMonthlyTotal(monthISO),
    getExpensesMonthlyTotal(monthISO),
  ]);
  await ensureMonthRow(monthISO);

  return {
    month: monthISO,
    incomeTotal,
    expensesLogged,
    expensesRemaining: incomeTotal - expensesLogged,
  };
}
