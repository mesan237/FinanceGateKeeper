import {
  BUCKET_SET,
  BUCKET_VALUES,
  DEFAULT_ALLOCATION,
  type Bucket,
} from '@/constants/allocation';
import { execute, query } from '@/services/database';

import type {
  Allocation,
  AllocationBreakdown,
  AllocationDraft,
  MonthlyBudget,
  OverBudgetCheck,
} from './budget.types';

// Redistribution lives in its own module (decoupled, no cross-import) but is
// re-exported here so callers keep a single budget-service entry point.
export { redistributeEmergencyPct } from './budget.redistribution';

interface AllocationRow {
  id: number;
  month: string;
  emergency_fund_pct: number;
  savings_pct: number;
  projects_pct: number;
  expenses_pct: number;
  priority_order: string;
  is_locked: number;
  created_at: string;
}

const ALLOCATION_COLUMNS =
  'id, month, emergency_fund_pct, savings_pct, projects_pct, expenses_pct, priority_order, is_locked, created_at';

function parsePriorityOrder(serialized: string): Bucket[] {
  const parsed = JSON.parse(serialized) as unknown;
  if (!Array.isArray(parsed) || !parsed.every((b) => BUCKET_SET.has(b as string))) {
    // A persisted row should always be valid (write-side guard in `updateAllocation`).
    // Defending the read path keeps a corrupted manual edit from crashing the UI.
    return [...DEFAULT_ALLOCATION.priorityOrder];
  }
  return parsed as Bucket[];
}

function mapAllocation(row: AllocationRow): Allocation {
  return {
    id: row.id,
    month: row.month,
    emergencyFundPct: row.emergency_fund_pct,
    savingsPct: row.savings_pct,
    projectsPct: row.projects_pct,
    expensesPct: row.expenses_pct,
    priorityOrder: parsePriorityOrder(row.priority_order),
    isLocked: row.is_locked === 1,
    createdAt: row.created_at,
  };
}

function assertValidPercentages(draft: AllocationDraft): void {
  const values = [
    draft.emergencyFundPct,
    draft.savingsPct,
    draft.projectsPct,
    draft.expensesPct,
  ];
  for (const pct of values) {
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
      throw new Error('Allocation percentages must be integers in the range 0–100.');
    }
  }
  const total = values.reduce((acc, v) => acc + v, 0);
  if (total !== 100) {
    throw new Error(`Allocation percentages must sum to 100 (got ${total}).`);
  }
}

function assertValidPriorityOrder(order: ReadonlyArray<Bucket>): void {
  if (order.length !== BUCKET_VALUES.length) {
    throw new Error('Priority order must include all four buckets exactly once.');
  }
  const seen = new Set<string>();
  for (const bucket of order) {
    if (!BUCKET_SET.has(bucket as string)) {
      throw new Error(`Priority order contains an unknown bucket: ${bucket}.`);
    }
    if (seen.has(bucket as string)) {
      throw new Error(`Priority order contains a duplicate bucket: ${bucket}.`);
    }
    seen.add(bucket as string);
  }
}

/**
 * Returns the allocation row for `monthISO`, creating it with
 * `DEFAULT_ALLOCATION` if absent. Idempotent: a second call for the same month
 * returns the same row instead of inserting a duplicate. Uses
 * `INSERT OR IGNORE` + `SELECT`, which is race-safe thanks to the
 * `UNIQUE(month)` constraint.
 */
export async function getOrCreateCurrentAllocation(monthISO: string): Promise<Allocation> {
  await execute(
    `INSERT OR IGNORE INTO allocations
       (month, emergency_fund_pct, savings_pct, projects_pct, expenses_pct,
        priority_order, is_locked, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      monthISO,
      DEFAULT_ALLOCATION.emergencyFundPct,
      DEFAULT_ALLOCATION.savingsPct,
      DEFAULT_ALLOCATION.projectsPct,
      DEFAULT_ALLOCATION.expensesPct,
      JSON.stringify(DEFAULT_ALLOCATION.priorityOrder),
      new Date().toISOString(),
    ],
  );
  const allocation = await getAllocation(monthISO);
  if (!allocation) {
    // INSERT OR IGNORE followed by SELECT should always find the row.
    // If it doesn't, something is wrong with the connection — fail loudly.
    throw new Error(`Allocation row for ${monthISO} could not be retrieved after upsert.`);
  }
  return allocation;
}

/** Reads the allocation row for `monthISO` without creating one if absent. */
export async function getAllocation(monthISO: string): Promise<Allocation | null> {
  const rows = await query<AllocationRow>(
    `SELECT ${ALLOCATION_COLUMNS} FROM allocations WHERE month = ?`,
    [monthISO],
  );
  return rows[0] ? mapAllocation(rows[0]) : null;
}

/**
 * Writes a validated allocation draft. Throws on:
 *  - any percentage out of `[0, 100]` or not an integer;
 *  - percentages not summing to exactly 100;
 *  - a priority order that is not a permutation of the four buckets;
 *  - any save attempt against a locked month.
 *
 * No DB write occurs on any validation failure.
 */
export async function updateAllocation(
  monthISO: string,
  draft: AllocationDraft,
): Promise<void> {
  assertValidPercentages(draft);
  assertValidPriorityOrder(draft.priorityOrder);

  const existing = await getAllocation(monthISO);
  if (existing?.isLocked) {
    throw new Error(`Allocation for ${monthISO} is locked for this month.`);
  }

  if (existing) {
    await execute(
      `UPDATE allocations
         SET emergency_fund_pct = ?, savings_pct = ?, projects_pct = ?, expenses_pct = ?,
             priority_order = ?
       WHERE month = ?`,
      [
        draft.emergencyFundPct,
        draft.savingsPct,
        draft.projectsPct,
        draft.expensesPct,
        JSON.stringify(draft.priorityOrder),
        monthISO,
      ],
    );
  } else {
    await execute(
      `INSERT INTO allocations
         (month, emergency_fund_pct, savings_pct, projects_pct, expenses_pct,
          priority_order, is_locked, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        monthISO,
        draft.emergencyFundPct,
        draft.savingsPct,
        draft.projectsPct,
        draft.expensesPct,
        JSON.stringify(draft.priorityOrder),
        new Date().toISOString(),
      ],
    );
  }
}

/**
 * Marks `monthISO` as locked. Locked allocations cannot be edited by
 * `updateAllocation` until the next month rolls over. Calling twice is a no-op.
 */
export async function lockAllocation(monthISO: string): Promise<void> {
  await execute('UPDATE allocations SET is_locked = 1 WHERE month = ?', [monthISO]);
}

/**
 * Splits `incomeAmount` across the four buckets per the allocation's
 * percentages, using integer-floor division. Any rounding remainder is added
 * to `expenses` (the residual bucket by PRD convention) so the four amounts
 * always sum to `incomeAmount` exactly. Pure — no DB access, no async.
 */
export function calculateBreakdown(
  incomeAmount: number,
  allocation: Allocation,
): AllocationBreakdown {
  const emergencyFund = Math.floor((incomeAmount * allocation.emergencyFundPct) / 100);
  const savings = Math.floor((incomeAmount * allocation.savingsPct) / 100);
  const projects = Math.floor((incomeAmount * allocation.projectsPct) / 100);
  const expenses = incomeAmount - emergencyFund - savings - projects;
  return { emergencyFund, savings, projects, expenses };
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
 * Sums `amount` across every **allocated** income row whose `date` falls in
 * `monthISO`. Pending income (held in the unallocated pool, VS-19) is excluded
 * so it does not inflate the derived expense budget until the user deliberately
 * allocates it. The query reads the income table directly (rather than importing
 * `income.service`) to keep `budget` from cross-importing `income` as a module —
 * mirrors how `getExpensesMonthlyTotal` reads the expenses table directly.
 */
async function getIncomeMonthlyTotal(monthISO: string): Promise<number> {
  const [row] = await query<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM income
      WHERE date LIKE ? AND allocation_status = 'allocated'`,
    [`${monthISO}-%`],
  );
  return row.total;
}

/**
 * Composes the monthly budget view: income total, the (auto-materialised)
 * allocation, its breakdown against that income, the total expenses logged so
 * far, and the remaining expense budget.
 */
export async function getMonthlyBudget(monthISO: string): Promise<MonthlyBudget> {
  const [incomeTotal, allocation, expensesLogged] = await Promise.all([
    getIncomeMonthlyTotal(monthISO),
    getOrCreateCurrentAllocation(monthISO),
    getExpensesMonthlyTotal(monthISO),
  ]);
  const breakdown = calculateBreakdown(incomeTotal, allocation);
  return {
    month: monthISO,
    incomeTotal,
    allocation,
    breakdown,
    expensesLogged,
    expensesRemaining: breakdown.expenses - expensesLogged,
  };
}

/**
 * Decides whether logging `newExpenseAmount` this month would push total
 * expenses past the month's confirmed expense allocation.
 *
 * The guard is only active once the allocation is **locked** (the user has
 * confirmed it on the allocation screen). Until then — learning mode, or a
 * control-mode month not yet set up — the auto-materialised default allocation
 * stays unlocked and this always reports "not over", so expense logging is
 * never interrupted before a budget exists. Lands-exactly-on-budget is not over
 * (`>`, not `>=`).
 */
export async function checkOverBudget(
  monthISO: string,
  newExpenseAmount: number,
): Promise<OverBudgetCheck> {
  const budget = await getMonthlyBudget(monthISO);
  const expenseBudget = budget.breakdown.expenses;
  const remaining = budget.expensesRemaining;
  if (!budget.allocation.isLocked) {
    return { isOver: false, overage: 0, remaining, expenseBudget };
  }
  const after = budget.expensesLogged + newExpenseAmount;
  const isOver = after > expenseBudget;
  return { isOver, overage: isOver ? after - expenseBudget : 0, remaining, expenseBudget };
}
