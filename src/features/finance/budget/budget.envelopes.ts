import { execute, query } from '@/services/database';
import { lastDayOfMonth } from '@/utils/monthMath';

import { buildCarryChain } from './budget.progress';
import type { CarryChainEntry } from './budget.progress';

/**
 * The `category_budgets` table (VS-33) — per-category monthly spending
 * envelopes: reads, writes, and the rollover carry chain.
 *
 * Composition of the Budget tab's view sits next door in `budget.plan.ts`; this
 * module is only about what is stored and what can be derived directly from it.
 */

/** A persisted `category_budgets` row. */
export interface CategoryBudget {
  id: number;
  month: string;
  categoryId: number;
  allocatedAmount: number;
  rolloverEnabled: boolean;
  createdAt: string;
}

interface CategoryBudgetRow {
  id: number;
  month: string;
  category_id: number;
  allocated_amount: number;
  rollover_enabled: number;
  created_at: string;
}

const COLUMNS = 'id, month, category_id, allocated_amount, rollover_enabled, created_at';

function mapRow(row: CategoryBudgetRow): CategoryBudget {
  return {
    id: row.id,
    month: row.month,
    categoryId: row.category_id,
    allocatedAmount: row.allocated_amount,
    rolloverEnabled: row.rollover_enabled === 1,
    createdAt: row.created_at,
  };
}

/** Rejects amounts that are not whole, non-negative FCFA. */
function assertValidAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error('A budget amount must be a whole number of FCFA, zero or greater.');
  }
}

// ---- Envelope persistence ---------------------------------------------------

/** Every envelope set for `monthISO`, in category order. */
export async function getCategoryBudgets(monthISO: string): Promise<CategoryBudget[]> {
  const rows = await query<CategoryBudgetRow>(
    `SELECT ${COLUMNS} FROM category_budgets WHERE month = ? ORDER BY category_id`,
    [monthISO],
  );
  return rows.map(mapRow);
}

/**
 * Sets (or replaces) one category's envelope for a month.
 *
 * Upserts on `UNIQUE(month, category_id)`, so editing mid-month overwrites
 * rather than stacking rows — envelopes are deliberately **not** subject to the
 * allocation month-lock. That lock governs money which has already moved into
 * funds and projects; a spending plan has to stay adjustable as a month unfolds.
 *
 * @param rolloverEnabled Omit to leave an existing row's flag untouched
 *   (defaults to off when creating).
 * @throws if `amount` is not a whole, non-negative number.
 */
export async function setCategoryBudget(
  monthISO: string,
  categoryId: number,
  amount: number,
  rolloverEnabled?: boolean,
): Promise<void> {
  assertValidAmount(amount);

  const existing = await query<{ rollover_enabled: number }>(
    'SELECT rollover_enabled FROM category_budgets WHERE month = ? AND category_id = ?',
    [monthISO, categoryId],
  );
  const rollover = rolloverEnabled ?? (existing[0] ? existing[0].rollover_enabled === 1 : false);

  await execute(
    `INSERT INTO category_budgets
       (month, category_id, allocated_amount, rollover_enabled, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(month, category_id) DO UPDATE SET
       allocated_amount = excluded.allocated_amount,
       rollover_enabled = excluded.rollover_enabled`,
    [monthISO, categoryId, amount, rollover ? 1 : 0, new Date().toISOString()],
  );
}

/** Deletes one category's envelope for a month. A no-op when none exists. */
export async function removeCategoryBudget(monthISO: string, categoryId: number): Promise<void> {
  await execute('DELETE FROM category_budgets WHERE month = ? AND category_id = ?', [
    monthISO,
    categoryId,
  ]);
}

/**
 * Moves budget from one envelope to another within the same month — the
 * "cover this overspend from somewhere else" action.
 *
 * Conserving the month's total is the whole point: covering an overspend should
 * be a decision about priorities, not a quiet increase of the overall budget.
 *
 * @throws if source and destination match, the amount is not positive, or the
 *   source does not hold that much.
 */
export async function moveBudget(
  monthISO: string,
  fromCategoryId: number,
  toCategoryId: number,
  amount: number,
): Promise<void> {
  if (fromCategoryId === toCategoryId) {
    throw new Error('Choose a different category to move budget from.');
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('The amount to move must be a whole number of FCFA above zero.');
  }

  const budgets = await getCategoryBudgets(monthISO);
  const source = budgets.find((b) => b.categoryId === fromCategoryId);
  if (!source || source.allocatedAmount < amount) {
    throw new Error('That category does not have enough budget to move.');
  }
  const destination = budgets.find((b) => b.categoryId === toCategoryId);

  await setCategoryBudget(monthISO, fromCategoryId, source.allocatedAmount - amount);
  await setCategoryBudget(monthISO, toCategoryId, (destination?.allocatedAmount ?? 0) + amount);
}

// ---- The month's explicit total ---------------------------------------------

/**
 * Sets the month's explicit spendable total, or clears it back to `null` so the
 * derived income-split figure takes over again.
 *
 * @throws if `amount` is not a whole, non-negative number.
 */
export async function setTotalBudget(monthISO: string, amount: number | null): Promise<void> {
  if (amount !== null) assertValidAmount(amount);
  await execute('UPDATE allocations SET total_budget = ? WHERE month = ?', [amount, monthISO]);
}

/** The month's explicit total, or `null` when it is derived from the income split. */
export async function getTotalBudget(monthISO: string): Promise<number | null> {
  const rows = await query<{ total_budget: number | null }>(
    'SELECT total_budget FROM allocations WHERE month = ?',
    [monthISO],
  );
  return rows[0]?.total_budget ?? null;
}

// ---- Spend lookups ----------------------------------------------------------

/** Spend per category for one month, keyed by category id. */
export async function getSpendByCategory(monthISO: string): Promise<Map<number, number>> {
  const rows = await query<{ category_id: number; total: number }>(
    `SELECT category_id, COALESCE(SUM(amount), 0) AS total
       FROM expenses WHERE date LIKE ? GROUP BY category_id`,
    [`${monthISO}-%`],
  );
  return new Map(rows.map((r) => [r.category_id, r.total]));
}

/**
 * Spend per (month, category) up to and including `monthISO`, keyed
 * `"YYYY-MM:categoryId"`. One query feeds every category's carry chain, so
 * replaying history costs no extra round-trips per category.
 */
async function getHistoricSpend(monthISO: string): Promise<Map<string, number>> {
  const rows = await query<{ month: string; category_id: number; total: number }>(
    `SELECT substr(date, 1, 7) AS month, category_id, COALESCE(SUM(amount), 0) AS total
       FROM expenses WHERE date <= ? GROUP BY month, category_id`,
    [lastDayOfMonth(monthISO)],
  );
  return new Map(rows.map((r) => [`${r.month}:${r.category_id}`, r.total]));
}

/**
 * Carried-in balance per category for `monthISO`.
 *
 * Only categories whose envelope has rollover enabled **this** month can carry,
 * so the toggle reads the way it behaves and switching it off cleanly resets the
 * chain. The chain is replayed from each category's envelope history rather than
 * stored, so correcting an earlier month propagates forward instead of leaving a
 * stale balance behind.
 *
 * Returns an empty map when no envelope in the month has rollover enabled — the
 * common case, which then costs a single cheap query.
 */
export async function getCarriedIn(monthISO: string): Promise<Map<number, number>> {
  const rollovers = await query<{ category_id: number }>(
    'SELECT category_id FROM category_budgets WHERE month = ? AND rollover_enabled = 1',
    [monthISO],
  );
  const carried = new Map<number, number>();
  if (rollovers.length === 0) return carried;

  const [history, spend] = await Promise.all([
    query<CategoryBudgetRow>(
      `SELECT ${COLUMNS} FROM category_budgets WHERE month <= ? ORDER BY category_id, month`,
      [monthISO],
    ),
    getHistoricSpend(monthISO),
  ]);

  for (const { category_id: categoryId } of rollovers) {
    const entries: CarryChainEntry[] = history
      .filter((row) => row.category_id === categoryId)
      .map((row) => ({
        month: row.month,
        allocated: row.allocated_amount,
        spent: spend.get(`${row.month}:${categoryId}`) ?? 0,
        rolloverEnabled: row.rollover_enabled === 1,
      }));
    carried.set(categoryId, buildCarryChain(entries).get(monthISO) ?? 0);
  }

  return carried;
}

/**
 * Copies every envelope from one month to another, overwriting any that already
 * exist. Backs the planner's "same as last month" shortcut — the single biggest
 * friction reduction for a plan that rarely changes much month to month.
 *
 * @returns How many envelopes were copied.
 */
export async function copyBudgetsFromMonth(
  fromMonthISO: string,
  toMonthISO: string,
): Promise<number> {
  const source = await getCategoryBudgets(fromMonthISO);
  for (const budget of source) {
    await setCategoryBudget(
      toMonthISO,
      budget.categoryId,
      budget.allocatedAmount,
      budget.rolloverEnabled,
    );
  }
  return source.length;
}
