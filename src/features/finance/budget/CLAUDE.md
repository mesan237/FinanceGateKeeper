# Budget Feature Context

## Domain Responsibility
Two related jobs:

1. **The income split** — percentage-based allocation of each income across four
   buckets, the post-income allocation screen, and the held-income pool.
2. **The monthly spending plan (VS-33)** — an overall monthly budget subdivided
   into per-category envelopes, with pacing, projection, and health tracking.

## Database Tables
- `allocations` — id, month (YYYY-MM), emergency_fund_pct, savings_pct, projects_pct,
  expenses_pct, priority_order (JSON), is_locked, **total_budget** (nullable), created_at
- `category_budgets` — id, month, category_id, allocated_amount, rollover_enabled,
  created_at, `UNIQUE(month, category_id)`

## Key Business Rules

### The income split
- Allocation percentages MUST sum to exactly 100. Reject any save that doesn't.
- Priority order: emergency_fund → savings → projects → expenses (default). User can reorder.
- The split is **locked per month**. Once confirmed, percentages cannot change until next month.
- When income is logged, navigate to AllocationScreen showing the breakdown. User confirms,
  allocation records are updated.
- Deferred allocation (VS-19): income is held until allocated. `AllocationScreen` Confirm marks
  the income allocated; "Hold for later" leaves it pending. `UnallocatedPoolScreen` lists held
  income and sends each entry to a destination — the expense budget, a fund, or an active
  project — via `useUnallocatedPool().allocate`. This is why `budget → income` is an approved edge.

### The monthly plan (VS-33)
- **The total is hybrid.** `allocations.total_budget` is nullable, and NULL is meaningful: it
  means "derive the total the way the app always has" — allocated income × `expenses_pct`.
  Setting a value overrides the derived figure for that month only; clearing it returns to
  the split. Existing months needed no backfill.
- **Envelopes are never month-locked.** The lock governs money that has already moved into
  funds and projects; a spending plan has to stay adjustable as the month unfolds. Editing an
  envelope mid-month is expected, not an exception.
- **Rollover is per-category opt-in** (`rollover_enabled`). Leftover *and* overspend carry
  forward, cumulatively. The carry is gated on the **receiving** month's flag, so the toggle
  reads the way it behaves and switching it off cleanly resets the chain.
- **The carry chain is never stored.** It is replayed from each category's envelope history on
  every read, so correcting an earlier month propagates forward instead of leaving a stale
  balance behind.
- `assigned` (what the planner distributes) counts only `allocated_amount`, never carry — so
  "drive Unassigned to zero" stays a clean, finishable task.
- A category with no envelope but some spending is surfaced with a **zero budget**, not hidden.
  Unplanned spend is exactly what the user needs to see.
- The month's `spent` counts **all** expenses, budgeted or not — a hero figure that ignored
  unbudgeted spending would flatter the user precisely when they need the truth.

### Health and pacing
- `budgetHealth` is `over` when spent > available; `at_risk` when the run-rate *projects* past
  the budget **or** consumption ≥ 80% with days still to fund; `on_track` otherwise.
  Projecting rather than only thresholding is the point — 45% consumed on the 6th is a problem
  a flat percentage test cannot see.
- Every status is shown as a **word** in a tinted chip, with colour as reinforcement only
  (UX audit L5). `budgetHealthDisplay.ts` is the single source for label/tone/colour.
- Progress bars carry a **pace marker** at the even-spend position, so a bar answers
  "am I ahead or behind?" rather than only "how much is gone?".

### Over-budget guards
- `checkOverBudget(monthISO, amount)` — month-wide. Only active once the allocation is
  **locked**, so it stays inert in learning mode and before a month is confirmed.
- `checkCategoryBudget(monthISO, categoryId, amount)` — per envelope. **Not** gated on the
  lock: a category budget is a number the user typed on purpose, so it binds the moment it
  exists. A category with no envelope reports `hasBudget: false` and never flags.
- The expense screens check the **category first** — "3,000 over your Food budget" points at a
  specific decision, where the month-wide warning only says something somewhere is too much.
- Overspending offers to **cover from another envelope** (`moveBudget`), which conserves the
  month's total. Covering an overspend should be a decision about priorities, not a quiet
  increase of the overall budget.

## Redistribution Logic
When the emergency fund hits its target:
1. `funds.service` notifies that the target is met.
2. `budget.redistribution.redistributeEmergencyPct()` splits the emergency percentage
   proportionally across savings, projects, and expenses.
3. New percentages are saved for the current month (an exception to the lock rule —
   redistribution is automatic).

## Module Map

Split for the 300-line ceiling; each file has one job.

| File | Job |
| --- | --- |
| `budget.service.ts` | Allocation rows, percentages, lock, breakdown, monthly composition |
| `budget.redistribution.ts` | Emergency-percentage redistribution |
| `budget.progress.ts` | **Pure** math: health, projection, pace, carry chain, weekly/burn-down |
| `budget.envelopes.ts` | `category_budgets` storage: CRUD, totals, spend reads, carry |
| `budget.plan.ts` | Composition for the tab and planner; both over-budget guards |
| `budget.insights.ts` | Analytics: weekly trend, burn-down, budget share, month-over-month |
| `budget.types.ts` | Slice types |
| `budget.hooks.ts` | Income-split hooks: useAllocation, useBudgetStatus, useUnallocatedPool, useOverBudgetCheck |
| `budget.envelope.hooks.ts` | useBudgetOverview, useEnvelopeActions, useCategoryOverBudgetCheck |
| `budget.planner.hooks.ts` | useBudgetPlanner — the planner's draft-state machine |
| `budgetHealthDisplay.ts` | Health verdict → label, chip tone, bar colour |

`budget.plan.ts` imports `getMonthlyBudget` from `budget.service.ts`, so the service does
**not** re-export the envelope modules — that would close a cycle. In-slice callers import
`budget.envelopes` / `budget.plan` directly.

## Screens
- `BudgetOverview.tsx` — the Budget tab: month stepper, hero, unassigned strip, envelope list,
  insights, demoted income-split card. Refreshes on focus (expenses are logged elsewhere).
- `BudgetHeroCard.tsx` — remaining, paced meter, status word, days/daily/projection stats
- `CategoryEnvelopeRow.tsx` — one envelope with its meter, pace marker, and run-rate
- `BudgetPlannerScreen.tsx` + `PlannerCategoryRow.tsx` + `BudgetPlannerRoute.tsx` — the planner
- `EnvelopeEditSheet.tsx` — single-envelope edit, rollover toggle, cover-from-another
- `BudgetInsights.tsx` + `BudgetBurndown.tsx` — the analytics block (collapsed by default)
- `IncomeSplitCard.tsx` — the four buckets as one stacked composition bar
- `AllocationScreen.tsx` — post-income breakdown (Confirm / Hold for later / Adjust split)
- `AllocationSettings.tsx` + `AllocationSettingsRoute.tsx` — percentages + priority reorder
- `UnallocatedPoolScreen.tsx` + `UnallocatedPoolRoute.tsx` — held-income pool
- `OverBudgetAlert.tsx` — warning modal, category-aware

## Visualizations: what is deliberately absent
Reports owns the spending donut and the Dashboard owns the daily sparkline. Repeating either
here would add pixels without adding a decision, so the Budget tab carries only paced meters,
the burn-down, weekly bars, budget-share ranking, and month-over-month deltas.
