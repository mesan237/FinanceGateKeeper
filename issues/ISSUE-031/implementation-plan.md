# ISSUE-031 — VS-33: Monthly Budgeting Redesign (Envelopes, Pacing & Insights)

## Problem Statement

The Budget tab records the consequences of income allocation; it does not let the
user *plan* a month. Concretely:

- There are **no per-category budgets**. `budget/CLAUDE.md` documents a
  `category_budgets` table that has never existed — no migration, no service, no UI.
- The monthly spendable figure is **derived only** (`allocated income × expenses_pct`).
  A user cannot say "I will spend 250,000 this month."
- Nothing shows **how much of the total is already distributed**, so nothing can warn
  that category budgets exceed the total.
- There is **no pacing or projection math** in the slice. The primitives live in
  `dashboard.service.ts`, which `budget` may not import.
- Mid-month editing is **blocked by the month lock**.
- `checkOverBudget` is whole-month only — VS-12's promised per-category copy
  ("3,000 over your Food budget") never shipped.
- The Budget tab has **no month navigation**, a one-line empty state, a bare
  `Loading…`, and **never refreshes on focus** (a live staleness bug).

## Product Decisions (confirmed)

1. **Total budget = hybrid.** A nullable `allocations.total_budget`. When `NULL`, the
   total is exactly today's derived figure. When set, the explicit amount wins for
   that month. The income-split engine (funds, projects, redistribution) is untouched.
2. **Rollover = per-category opt-in.** `category_budgets.rollover_enabled`. Leftover
   *and* overspend carry forward, cumulatively, only for categories where the flag is
   on **in the receiving month**.
3. **The month lock splits in two.** The income split stays locked per month (it
   governs money that has already moved). Category envelopes and the total budget are
   **never locked** — the brief requires mid-month editing.

## Information Architecture

```
Budget tab  (month stepper in the body header)
├── Hero — "Left to spend"
│   ├── AnimatedCounter figure
│   ├── meter: spent / available, with an expected-pace marker + overflow segment
│   ├── StatusChip: On track · Watch out · Over budget      (word, not just colour)
│   └── stat row: days left · safe daily spend · projected end-of-month
├── Unassigned strip   (only when unassigned ≠ 0) → "Assign 45,000" → planner
├── Envelopes — one row per budgeted category
│   └── icon · name · spent of allocated · remaining · meter+marker · status dot
│       tap → EnvelopeEditSheet (amount, rollover toggle, cover-from)
├── Insights  (collapsed by default after the first month)
│   ├── Burn-down: ideal vs actual remaining over the month
│   ├── Weekly trend bars (W1…W5 vs weekly pace)
│   ├── Top consumers — share of *budget*, ranked
│   └── vs last month — per-category deltas (suppressed with no prior data)
└── Income split card  (the existing four buckets, demoted from hero position)

/budget/plan      — the planner: total + per-category allocation, live Unassigned
/budget/settings  — unchanged (income split percentages, priority)
/budget/unallocated — unchanged (held income pool)
```

## Data Model

**Migration 026 — `category_budgets`**

```sql
CREATE TABLE category_budgets (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  month            TEXT    NOT NULL,               -- YYYY-MM
  category_id      INTEGER NOT NULL REFERENCES categories(id),
  allocated_amount INTEGER NOT NULL,               -- whole FCFA
  rollover_enabled INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL,
  UNIQUE(month, category_id)
);
CREATE INDEX idx_category_budgets_month ON category_budgets(month);
```

**Migration 027 — `ALTER TABLE allocations ADD COLUMN total_budget INTEGER`**
(nullable; `NULL` = derive from the income split).

**Migration 028 — sync wiring.** `addSyncColumns(db, 'category_budgets')`, and
recreate the `allocations` update trigger with `total_budget` appended (the
migration-021 pattern). `category_budgets` joins `SYNCED_TABLES` + `DATA_COLUMNS`
in 017 (excluded from `TABLES_PROVISIONED_HERE`, like `accounts`/`transfers`) and
`FOREIGN_KEYS` in `sync.mapping.ts`. `supabase/schema.sql` gains the mirror table.

### Rollover carry chain

No stored carry column — the chain is recomputed, so editing history stays correct.
For a category, walk forward from its earliest budgeted month:

```
carryIn(first) = 0
available(m)   = allocated(m) + carryIn(m) − spent(m)
carryIn(m+1)   = rolloverEnabled(m+1) ? available(m) : 0
```

Gating on the **receiving** month's flag makes the toggle behave the way it reads
("this envelope rolls over"), and switching it off cleanly resets the chain.
`assigned` (what the planner distributes) counts only `allocated_amount`, never
carry — so "Unassigned → 0" stays a clean, finishable task.

## Derived Types (`budget.types.ts`)

```ts
export type BudgetHealth = 'on_track' | 'at_risk' | 'over';

export interface CategoryBudgetProgress {
  categoryId: number; categoryName: string;
  allocated: number; carriedIn: number; available: number;   // allocated + carriedIn
  spent: number; remaining: number;                          // may be negative
  consumedPct: number;                                       // uncapped, so overage is visible
  dailyAverage: number; projected: number; expectedToDate: number;
  rolloverEnabled: boolean; health: BudgetHealth;
}

export interface MonthlyPlan {
  month: string; totalBudget: number; isExplicit: boolean;
  assigned: number; unassigned: number; isOverAllocated: boolean;
}

export interface BudgetOverview {         // the same insight set, for the whole month
  plan: MonthlyPlan; categories: CategoryBudgetProgress[];
  totalCarried: number; available: number; spent: number; remaining: number;
  consumedPct: number; dailyAverage: number; projected: number;
  expectedToDate: number; safeDailySpend: number;
  daysElapsed: number; daysRemaining: number; health: BudgetHealth;
}
```

**Health rule** (pure): `over` when `spent > available`; `at_risk` when
`projected > available` **or** (`consumedPct ≥ 80` with days remaining);
`on_track` otherwise. Strictly better than the dashboard's flat 75% threshold,
which ignores pace — the dashboard adopts it too (`dashboard → budget` is approved).

## Step-by-Step Plan

### Phase 0 — Shared infrastructure

1. `utils/monthMath.ts` — `daysInMonth`, `daysElapsedInMonth`, `daysRemainingInMonth`,
   `monthProgress`, `firstDayOfMonth`, `lastDayOfMonth`, `prevMonthISO`, `nextMonthISO`,
   `monthLabel`, `weekOfMonth`. Move the implementations out of `dashboard.service.ts`
   and `reports.service.ts`; both re-export/delegate so existing tests keep passing.
   (`budget` cannot import `dashboard`; this is the correct home.)
2. `components/EmptyState.tsx` + `components/LoadingState.tsx` + `components/Skeleton.tsx`
   — closes the open VS-28 items.
3. `components/MonthStepper.tsx` — promoted from `reports/NavArrows`; closes audit L2.
   `NavArrows` becomes a thin re-export so reports is untouched.
4. `components/StatusChip.tsx` — extracted from `BudgetSummaryCard`'s inline chip so
   Budget and Dashboard share one treatment; the status **word** closes audit L5.
5. `ProgressBar`: add `marker?: number` (pace tick) and `overflow?: number`
   (over-budget segment). Backward compatible — both default off.

### Phase 1 — Migrations
6. `026_create_category_budgets.ts`, `027_add_allocation_total_budget.ts`,
   `028_sync_category_budgets.ts`; register all three in `migrations/index.ts`;
   update `017`'s `SYNCED_TABLES`/`DATA_COLUMNS` and `sync.mapping`'s `FOREIGN_KEYS`.

### Phase 2 — Pure math
7. `budget/budget.progress.ts` — `budgetHealth`, `dailyAverage`, `projectSpend`,
   `expectedToDate`, `safeDailySpend`, `buildCarryChain`, `buildCategoryProgress`.
   No DB, no React. Kept out of `budget.service.ts`, which is at 308/300 lines
   (precedent: `budget.redistribution.ts`).

### Phase 3 — Service
8. `budget/budget.envelopes.ts` — `getCategoryBudgets(month)`,
   `setCategoryBudget(month, categoryId, amount, rollover?)`,
   `removeCategoryBudget`, `setTotalBudget(month, amount|null)`, `getTotalBudget`,
   `copyBudgetsFromMonth`, `suggestFromHistory(month, months)`,
   `moveBudget(month, fromCategoryId, toCategoryId, amount)` (the cover-from write),
   `getBudgetOverview(month)`, `checkCategoryBudget(month, categoryId, amount)`.
   Re-exported through `budget.service.ts` so callers keep one entry point.

### Phase 4 — Hooks
9. `budget.hooks.ts` — `useBudgetOverview(month)` (focus-refreshable),
   `useBudgetPlanner(month)` (draft state, live unassigned, suggestions, save),
   `useCategoryOverBudgetCheck()`.

### Phase 5 — Planner UI
10. `BudgetPlannerScreen.tsx` + `BudgetPlannerRoute.tsx` + `app/budget/plan.tsx`.
    Total field with suggestion chips (income split · last month · 3-month average),
    per-category rows with inline amount entry, a **sticky Unassigned footer** that
    counts to zero, and an over-allocation warning that blocks nothing but is loud.
11. `EnvelopeEditSheet.tsx` — single-envelope edit in a `BottomSheet`: amount,
    rollover toggle, "Cover from another envelope", remove.

### Phase 6 — Overview redesign
12. `BudgetHeroCard.tsx`, `CategoryEnvelopeRow.tsx`, `BudgetEmptyState.tsx`.
13. Rewrite `BudgetOverview.tsx` as composition: month stepper, hero, unassigned
    strip, envelope list, insights, demoted income-split card. Add `useFocusEffect`
    refresh (**fixes the staleness bug**) and skeleton loading. Replace the
    share-of-income bucket bars with a single honest stacked composition bar.

### Phase 7 — Insights
14. `BudgetBurndown.tsx` (react-native-svg, already a dependency — ideal vs actual
    remaining), `WeeklyTrendBars.tsx`, `TopConsumersCard.tsx`, `MonthOverMonthCard.tsx`.

**Deliberately not built:** a spending-distribution pie (Reports already owns the
donut) and a daily sparkline (the Dashboard already owns it). Duplicating them here
would add pixels without adding a decision.

### Phase 8 — Overspending
15. `checkCategoryBudget` + `OverBudgetAlert` gains optional `categoryName`
    (delivers VS-12's original copy). Wire through `ExpenseEntryPanel`,
    `ExpenseDetailScreen`, `QuickAddGrid`.
16. "Cover from…" — move money between envelopes instead of only warning.

### Phase 9 — Docs & verification
17. Rewrite `budget/CLAUDE.md` (removes the `category_budgets` doc rot), update
    `docs/ARCHITECTURE.md` and `docs/KANBAN.md` (VS-33).
18. Full `jest` suite, `tsc --noEmit`, `/check-arch`.

## Cross-Feature Edges

**No new edges.** `budget → expenses` (categories) and `budget → income` are already
approved; everything else is shared infra. `dashboard → budget` (adopting the health
rule) is likewise pre-approved.

## TDD Anchors

- `monthMath` — elapsed/remaining/progress across month boundaries, leap February,
  a month that is not the current month.
- `budget.progress` — health is `over` past budget, `at_risk` when the projection
  exceeds budget even at 40% consumed, `on_track` early in a quiet month; projection
  from a part-elapsed month; carry chain accumulates, resets when the flag is off,
  and carries negative overspend.
- `budget.envelopes` — set/update is idempotent per `(month, category)`; explicit
  total wins over derived; `NULL` total falls back to derived; `unassigned` reacts to
  allocation edits; `moveBudget` conserves the total; `checkCategoryBudget` flags per
  category independent of the month lock; `suggestFromHistory` averages only months
  with data.
- Screens — planner renders unassigned and drives it to zero; over-allocation warns;
  envelope sheet saves an amount and toggles rollover; overview renders the pace
  marker, the status **word**, the empty state with its CTA, and skeletons while
  loading; the month stepper moves months; focus refresh re-reads.
- Migrations — 026 enforces `UNIQUE(month, category_id)`; 027 defaults `total_budget`
  to NULL for existing rows; 028 gives `category_budgets` uuid/updated_at/sync_status
  and a working dirty trigger.

## Done When

A user opens Budget on a fresh month, taps one CTA, sets a total (or accepts the
suggestion), distributes it across categories watching Unassigned fall to zero, and
then sees — per category and overall — spent, remaining, % consumed, daily average,
projected end-of-month, and an on-track/at-risk/over verdict paced against today.
Overspending names the category and offers to cover it from another envelope.
Budgets stay editable all month. Suite + `tsc` + `/check-arch` clean.
