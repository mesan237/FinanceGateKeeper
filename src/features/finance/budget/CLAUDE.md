# Budget Feature Context

## Domain Responsibility
The monthly spending plan: an overall monthly budget subdivided into per-category
envelopes, with pacing, projection, and health tracking.

The four-bucket **income split** this slice used to own — allocation percentages, the
post-income allocation screen, the month lock, the held-income pool, and emergency
redistribution — was parked in VS-34. It lives on
`feat/parked-projects-funds-allocation` along with the `funds` and `projects` slices
it fed. Nothing here reads it any more.

## Database Tables
- `allocations` — id, month (YYYY-MM), **total_budget** (nullable), created_at, plus
  four percentage columns and a lock flag left over from the parked split
- `category_budgets` — id, month, category_id, allocated_amount, rollover_enabled,
  created_at, `UNIQUE(month, category_id)`

The leftover percentage columns are NOT NULL, so `ensureMonthRow` fills them once on
insert and nothing ever reads them. They stay because dropping them would need a
migration, and a migration invalidates every existing export file — the same
reasoning that kept the `funds` and `projects` tables.

## Key Business Rules

### The month's total
- **The total is hybrid.** `allocations.total_budget` is nullable, and NULL is
  meaningful: it means "derive the total". Setting a value overrides the derived
  figure for that month only; clearing it returns to the derived one.
- **NULL now derives from the month's income** (`getMonthlyBudget().incomeTotal`).
  Before VS-34 it derived from `allocated income × expenses_pct`; with no split there
  is no percentage to apply, so the whole month's income is the honest default.
  Existing months needed no backfill — only the derivation changed.
- The resolution (`explicit ?? derived`) lives in **one place**,
  `budget.plan.buildMonthlyPlan`. The Dashboard and Reports both call it rather than
  reading `incomeTotal` directly, so all three screens agree on what "the budget" is.

### Envelopes
- **Envelopes are never month-locked.** A spending plan has to stay adjustable as the
  month unfolds; editing an envelope mid-month is expected, not an exception.
- **Rollover is per-category opt-in** (`rollover_enabled`). Leftover *and* overspend
  carry forward, cumulatively. The carry is gated on the **receiving** month's flag,
  so the toggle reads the way it behaves and switching it off cleanly resets the chain.
- **The carry chain is never stored.** It is replayed from each category's envelope
  history on every read, so correcting an earlier month propagates forward instead of
  leaving a stale balance behind.
- `assigned` (what the planner distributes) counts only `allocated_amount`, never
  carry — so "drive Unassigned to zero" stays a clean, finishable task.
- A category with no envelope but some spending is surfaced with a **zero budget**,
  not hidden. Unplanned spend is exactly what the user needs to see.
- The month's `spent` counts **all** expenses, budgeted or not — a hero figure that
  ignored unbudgeted spending would flatter the user precisely when they need the truth.

### Health and pacing
- `budgetHealth` is `over` when spent > available; `at_risk` when the run-rate
  *projects* past the budget **or** consumption ≥ 80% with days still to fund;
  `on_track` otherwise. Projecting rather than only thresholding is the point — 45%
  consumed on the 6th is a problem a flat percentage test cannot see.
- Every status is shown as a **word** in a tinted chip, with colour as reinforcement
  only (UX audit L5). `budgetHealthDisplay.ts` is the single source for
  label/tone/colour.
- Progress bars carry a **pace marker** at the even-spend position, so a bar answers
  "am I ahead or behind?" rather than only "how much is gone?".

### Over-budget guards
- `checkOverBudget(monthISO, amount)` — month-wide. It used to be gated on the
  allocation lock; with nothing left to lock, what keeps it quiet is the **absence of
  a budget**: no explicit total and no income means nothing to be over, so logging
  into an unplanned month is never interrupted.
- `checkCategoryBudget(monthISO, categoryId, amount)` — per envelope. Binds the moment
  the envelope exists: a category budget is a number the user typed on purpose. A
  category with no envelope reports `hasBudget: false` and never flags.
- The expense screens check the **category first** — "3,000 over your Food budget"
  points at a specific decision, where the month-wide warning only says something
  somewhere is too much.
- Overspending offers to **cover from another envelope** (`moveBudget`), which
  conserves the month's total. Covering an overspend should be a decision about
  priorities, not a quiet increase of the overall budget.

## Module Map

Split for the 300-line ceiling; each file has one job.

| File | Job |
| --- | --- |
| `budget.service.ts` | Month row upkeep, income/expense monthly sums, `getMonthlyBudget` |
| `budget.progress.ts` | **Pure** math: health, projection, pace, carry chain, weekly/burn-down |
| `budget.envelopes.ts` | `category_budgets` storage: CRUD, totals, spend reads, carry, `total_budget` |
| `budget.plan.ts` | Composition for the tab and planner; both over-budget guards |
| `budget.insights.ts` | Analytics: weekly trend, burn-down, budget share, month-over-month |
| `budget.types.ts` | Slice types |
| `budget.hooks.ts` | `useBudgetStatus`, `useOverBudgetCheck` |
| `budget.envelope.hooks.ts` | `useBudgetOverview`, `useEnvelopeActions`, `useCategoryOverBudgetCheck` |
| `budget.planner.hooks.ts` | `useBudgetPlanner` — the planner's draft-state machine |
| `budgetHealthDisplay.ts` | Health verdict → label, chip tone, bar colour |

`budget.plan.ts` imports `getMonthlyBudget` from `budget.service.ts`, so the service
does **not** re-export the envelope modules — that would close a cycle. In-slice
callers import `budget.envelopes` / `budget.plan` directly.

## Screens
- `BudgetOverview.tsx` — the Budget tab: month stepper, hero, unassigned strip,
  envelope list, insights. Refreshes on focus (expenses are logged elsewhere).
- `BudgetHeroCard.tsx` — remaining, paced meter, status word, days/daily/projection stats
- `CategoryEnvelopeRow.tsx` — one envelope with its meter, pace marker, and run-rate
- `BudgetPlannerScreen.tsx` + `PlannerCategoryRow.tsx` + `BudgetPlannerRoute.tsx` — the planner
- `EnvelopeEditSheet.tsx` — single-envelope edit, rollover toggle, cover-from-another
- `BudgetInsights.tsx` + `BudgetBurndown.tsx` — the analytics block (collapsed by default)
- `OverBudgetAlert.tsx` — warning modal, category-aware

## Visualizations: what is deliberately absent
Reports owns the spending donut and the Dashboard owns the daily sparkline. Repeating
either here would add pixels without adding a decision, so the Budget tab carries only
paced meters, the burn-down, weekly bars, budget-share ranking, and month-over-month
deltas.
