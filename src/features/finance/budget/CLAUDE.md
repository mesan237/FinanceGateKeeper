# Budget Feature Context

## Domain Responsibility
Manages percentage-based income allocation, monthly category budgets, over-budget detection, and the allocation screen shown after income logging.

## Database Tables
- `allocations` — id, month (YYYY-MM), emergency_fund_pct, savings_pct, projects_pct, expenses_pct, priority_order (JSON), is_locked, created_at
- `category_budgets` — id, month, category_id, allocated_amount, created_at

## Key Business Rules
- Allocation percentages MUST sum to exactly 100. Reject any save that doesn't.
- Priority order: emergency_fund → savings → projects → expenses (default). User can reorder.
- Allocations are locked per month. Once confirmed, percentages cannot change until next month.
- When income is logged, navigate to AllocationScreen showing breakdown. User confirms, allocation records are updated.
- Over-budget check (VS-12): `checkOverBudget(monthISO, newExpenseAmount)` returns `{ isOver, overage, remaining, expenseBudget }`. It compares (expenses logged this month + the new amount) against the month's expense allocation, and only flags once the allocation is **locked** (so it stays inert in learning mode and before the month is confirmed). The expense screens consume it via `useOverBudgetCheck` + `OverBudgetAlert`.
- Per-category budgets (a `category_budgets` table subdividing the expense allocation, with a per-category overage) are **not built yet** — deferred to a follow-up slice.
- Remaining budget = (total **allocated** income for month × expenses_pct) − (total expenses for month). Held (`pending`) income is excluded until the user allocates it (VS-19).
- Deferred allocation (VS-19): income is held until allocated. `AllocationScreen` Confirm marks the income allocated; "Hold for later" leaves it pending. `UnallocatedPoolScreen` (reached from BudgetOverview) lists held income and lets the user send each entry to a destination — the expense budget, a fund, or an active project — via `useUnallocatedPool().allocate`. This is why `budget → income` is an approved edge (read held income, mark allocated).

## Allocation Flow
1. User logs income in `income` feature.
2. Income feature calls `budget.service.calculateAllocation(incomeAmount)`.
3. Returns breakdown: `{ emergencyFund: X, savings: Y, projects: Z, expenses: W }`.
4. User sees AllocationScreen with amounts per bucket.
5. User confirms → amounts are deposited to funds/projects via their respective services.
6. Expense budget for the month is updated.

## Redistribution Logic
When emergency fund hits its target:
1. `funds.service` notifies that target is met.
2. `budget.service.redistributeEmergencyPct()` takes the emergency_fund_pct and splits it proportionally across savings_pct, projects_pct, and expenses_pct.
3. New percentages are saved for the current month (exception to the lock rule — redistribution is automatic).

## Files in This Feature
- `AllocationScreen.tsx` — Post-income breakdown view (Confirm / Hold for later)
- `UnallocatedPoolScreen.tsx` + `UnallocatedPoolRoute.tsx` — Held-income pool with per-entry destination picker (VS-19)
- `BudgetOverview.tsx` — Category progress bars + unallocated-income link
- `AllocationSettings.tsx` — Percentage sliders + priority reorder
- `OverBudgetAlert.tsx` — Warning modal
- `budget.hooks.ts` — useAllocation, useBudgetStatus, useOverBudgetCheck, useUnallocatedPool
- `budget.service.ts` — Allocation math, budget tracking, over-budget detection
- `budget.types.ts` — Allocation, BudgetBucket, BucketPriority, MonthlyBudget, AllocationDestination
