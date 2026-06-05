import { execute, query } from '@/services/database';

interface PctRow {
  emergency_fund_pct: number;
  savings_pct: number;
  projects_pct: number;
  expenses_pct: number;
}

/**
 * Folds the emergency-fund percentage into the other three buckets when the
 * emergency fund has met its target, so future income stops being parked in a
 * full fund. The emergency percentage is split across savings/projects/expenses
 * proportionally to their current weights using integer-floor division, with
 * the rounding remainder added to `expenses` (the residual bucket, matching
 * `calculateBreakdown`) so the four still sum to exactly 100. `emergency` is
 * set to 0.
 *
 * This is the **one documented exception to the per-month allocation lock**
 * (budget `CLAUDE.md` → "Redistribution Logic"): it writes the row directly
 * rather than through `updateAllocation`, whose lock guard would reject it.
 * A no-op when the month has no allocation row, or its emergency percentage is
 * already 0. Lives in its own module (decoupled from `budget.service`, no
 * cross-import) so `budget.service` stays under the file-length cap.
 */
export async function redistributeEmergencyPct(monthISO: string): Promise<void> {
  const [row] = await query<PctRow>(
    `SELECT emergency_fund_pct, savings_pct, projects_pct, expenses_pct
       FROM allocations WHERE month = ?`,
    [monthISO],
  );
  if (!row) return;

  const e = row.emergency_fund_pct;
  if (e === 0) return;

  const s = row.savings_pct;
  const p = row.projects_pct;
  const x = row.expenses_pct;
  const others = s + p + x;

  let newSavings: number;
  let newProjects: number;
  let newExpenses: number;
  if (others === 0) {
    // Degenerate case (emergency was 100%): there are no weights to split
    // across, so the whole percentage lands in the residual bucket.
    newSavings = s;
    newProjects = p;
    newExpenses = x + e;
  } else {
    const addSavings = Math.floor((e * s) / others);
    const addProjects = Math.floor((e * p) / others);
    newSavings = s + addSavings;
    newProjects = p + addProjects;
    newExpenses = x + (e - addSavings - addProjects);
  }

  await execute(
    `UPDATE allocations
       SET emergency_fund_pct = 0, savings_pct = ?, projects_pct = ?, expenses_pct = ?
     WHERE month = ?`,
    [newSavings, newProjects, newExpenses, monthISO],
  );
}
