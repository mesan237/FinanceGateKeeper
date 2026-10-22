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
- `allocations` — id, month (YYYY-MM), **total_budget** (nullable), **surplus_seen**
  (nullable, VS-47), created_at, plus
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
- **NULL derives from expected income, else income received** (VS-47). Expected
  income is the `monthly_income` estimate in force when the month ended
  (`budget.cashflow.getExpectedIncome`), so a later estimate never rewrites a closed
  month. With no estimate the month follows income received, as it did since VS-34.
  This is what lets a salaried user plan before payday, and stops each irregular
  payment from growing the budget.
- **Income never raises the budget by itself.** Income received beyond the total is
  `unbudgetedIncome`; the Budget tab asks to give it a job (add to budget = an
  explicit total; leave unassigned = `surplus_seen`, which silences the prompt until
  more arrives). Only the current month asks.
- Expected income is never cash and never "income in": the Dashboard's cashflow and
  every report still read `plan.receivedIncome` / `incomeTotal`.
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

### Cash flow (VS-47)
- The Budget tab shows **budget left · cash in wallets · committed** for the current
  month only — cash is a today figure, and setting it beside a past month's plan would
  compare two moments. The budget is never subtracted from cash or committed.
- **Safe to spend** (VS-49) = cash on hand − cash in goal wallets − committed. A
  negative figure is said in words. Budget tab only (user decision); not on the
  dashboard.
- **Committed** (`budget.committed`) = recurring occurrences still to log, open
  planned items due (own date, else list date), and what is still owed on the user's
  pending debts due (total to repay, else the amount; for a scheduled debt only its
  unpaid instalments due, VS-54), and unpaid tontine contributions due (VS-52) — all up to month
  end, overdue included. Planned items and debts are read by SQL, so `budget` gains no
  dependency on `planned` or `debt`, and planned items still never touch the budget.
  Tontine dates follow a derived schedule, so they come from
  `tontines.getDueContributions` (approved `budget → tontines`). The breakdown names
  only the sources with something due.
- Cash on hand comes from `accounts.getCashOnHand` (approved `budget → accounts`).

### Pay yourself first (VS-49)
- `plan.setAside` = the monthly amounts of goals live during the month (created
  before it ended, not deleted before it began), read from `goals` by SQL
  (`budget.goals`). Deleting a goal leaves the months it was live unchanged.
- `plan.spendable = max(0, totalBudget − setAside)` is what the envelopes share
  (`unassigned = spendable − assigned`), what `available` starts from, and what the
  month-wide guard and Reports' "planned" measure against. `setAsideShortfall` says
  how far goals exceed the total.
- The guard stays silent only when `totalBudget` is 0. If goals take the whole
  budget, any spending warns.
- Surplus income is still measured against `totalBudget`. Goals are part of the
  plan, not extra spending.

### Category detail (VS-56)
- Tapping an envelope opens `/budget/category/[id]?month=`; the envelope sheet lives
  there now ("Edit budget"), not on the tab.
- The split is by subcategory and appears only when some expense in the month uses
  one. Repeats group purchases by note (trimmed, case-insensitive, at least two), so
  a user who never files subcategories still sees "Taxi ×18".
- Refunds net out of the totals and the split by themselves (they carry the
  purchase's subcategory); the purchase lists skip refund rows and subtract them from
  the purchase they refund. A fully refunded purchase drops out of "biggest".
- Fixed / variable / unexpected follows `expenses.spendKindOf`, the one rule the
  typical-month profile and the reserve use.
- The usual month is `suggestFromHistory` (complete months only), so it matches the
  planner's "Use my averages". The current month is compared on its envelope
  projection, a closed month on what it spent; within 5% reads as "about the same".

## Module Map

Split for the 300-line ceiling; each file has one job.

| File | Job |
| --- | --- |
| `budget.service.ts` | Month row upkeep, income/expense monthly sums, `getMonthlyBudget` |
| `budget.progress.ts` | **Pure** math: health, projection, pace, carry chain, weekly/burn-down |
| `budget.envelopes.ts` | `category_budgets` storage: CRUD, totals, spend reads, carry, `total_budget` |
| `budget.plan.ts` | Composition for the tab and planner; both over-budget guards |
| `budget.cashflow.ts` | Expected income, the surplus answers (`surplus_seen`, add to budget) |
| `budget.committed.ts` | Committed money: recurring, planned and debts due by month end |
| `budget.goals.ts` | Goals' monthly set-aside and goal-wallet cash, read by SQL (VS-49) |
| `budget.suggestions.ts` | `suggestFromHistory` (re-exported by `budget.plan`) |
| `budget.cashflow.hooks.ts` | `useCashflow` — money view + surplus actions for the tab |
| `budget.insights.ts` | Analytics: weekly trend, burn-down, budget share, month-over-month |
| `budget.categoryDetail.ts` | One category's month taken apart: split, repeats, biggest, kinds, usual (VS-56) |
| `budget.categoryDetail.hooks.ts` | `useCategoryDetail` — the detail, its envelope and cover sources, its transactions |
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
- `CategoryDetailScreen.tsx` + `CategoryDetailSections.tsx` + `CategoryDetailRoute.tsx` —
  the category drill-down opened from an envelope (VS-56)
- `EnvelopeEditSheet.tsx` — single-envelope edit, rollover toggle, cover-from-another;
  opened from the category detail
- `SurplusCard.tsx` — "give it a job" for income beyond the budget (VS-47)
- `MoneyViewCard.tsx` — budget left · cash in wallets · committed (VS-47)
- `BudgetInsights.tsx` + `BudgetBurndown.tsx` — the analytics block (collapsed by default)
- `OverBudgetAlert.tsx` — warning modal, category-aware

## Visualizations: what is deliberately absent
Reports owns the spending donut and the Dashboard owns the daily sparkline. Repeating
either here would add pixels without adding a decision, so the Budget tab carries only
paced meters, the burn-down, weekly bars, budget-share ranking, and month-over-month
deltas.
