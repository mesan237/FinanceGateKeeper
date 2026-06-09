# ISSUE-013 — Dashboard

**Maps to:** KANBAN VS-13
**Priority:** High
**Blocked by:** VS-03 Expense Logging (✅), VS-05 Income Logging (✅), VS-06 Budget Allocation (✅),
VS-09 Funds (✅), VS-10 Projects (✅) — all complete. This slice adds **no new cross-feature edge**:
`dashboard → expenses, budget, funds, projects` are all already on the approved table
(`docs/ARCHITECTURE.md`). It also adds **no migration** — the dashboard owns no tables, it only reads.

---

## Scope Decision (settled before drafting)

1. **Debt card is out of scope.** The dashboard's approved-reads list includes `debt`, but the KANBAN
   VS-13 scope and Done-when never mention a debt summary — the cards listed are budget, funds, top
   project, and today's spending. Surfacing the people ledger on the home screen is deferred (the edge
   stays approved for a later slice). Keeps VS-13 to the five blockers it's actually gated on.

2. **The learning-mode gate is done at the routing layer — dashboard never imports `auth`.** The
   established principle (VS-08) is *"app-mode gating lives at the routing layer (no feature→feature
   imports)"*; `app/(tabs)/_layout.tsx` already consumes `useAppMode()`. So the dashboard **route**
   reads the mode and passes a plain boolean `includeBudgetData` down; the dashboard feature has zero
   dependency on `auth` (no service, type, or hook import). *Rejected:* add `dashboard → auth` to the
   approved table and call `useAppMode()` inside `DashboardScreen` — that would couple the home screen
   to the auth feature for a signal the route already holds, contradicting the VS-08 precedent.

3. **The dashboard keeps its own thin `service.ts`** even though the feature owns no tables. The
   aggregation (five cross-feature reads + the pace math) is pure logic over SQLite and is best tested
   with an in-memory DB per the repo's TDD rule (*"no mocking SQLite in service tests"*); the hook test
   then mocks that one service. This mirrors every other slice's service/hook split. The dashboard
   CLAUDE.md file list omitted a service — that list is updated as part of this slice.

---

## Problem Statement

There is no home screen. `app/(tabs)/dashboard.tsx` renders an empty `<View />`. The user has to open
each feature tab to learn their state. VS-13 makes the Dashboard the at-a-glance overview: how much
expense budget is left this month (with a pace colour), how the emergency fund and savings are
tracking, the top active project's progress, and what's been spent **today** — plus a fixed action bar
to jump straight into logging.

Two constraints shape the design:

1. **Read-only aggregation.** The dashboard writes nothing except the one-tap *Confirm Zero Day*
   action, which it delegates to the existing `expenses` zero-day service. Every other number is a read
   composed from `budget`, `funds`, `projects`, and `expenses` services.
2. **Learning mode hides budgeting.** In learning mode the user has no confirmed allocation, no funds
   flow, and budgeting is hidden from the tab bar. The dashboard must then show **only** today's
   spending and the quick-log actions — no budget/fund/project cards. The route supplies that flag.

## User Stories

- **As the user,** opening the app lands me on a Dashboard showing "162,000 FCFA remaining this month",
  with a green/yellow/red indicator for my spending pace.
- **As the user,** I see mini progress bars for my emergency fund (e.g. 64%) and savings (e.g. 38%),
  and my top active project's funding (e.g. "E-commerce Launch — 22%").
- **As the user,** I see today's total spending so I know where the day stands.
- **As the user,** a fixed action bar lets me tap **Log Expense**, **Log Income**, or **Confirm Zero
  Day** without hunting through tabs.
- **As the user in learning mode,** the Dashboard shows only today's spending and the log actions —
  no budget, fund, or project cards (budgeting isn't active yet).
- **As the user,** the Dashboard refreshes every time I return to the tab, so the numbers are never
  stale after I log something elsewhere.

## Scope

Each bullet maps to a concrete file. Order is top-to-bottom (tests precede implementation per TDD).

### Types — `src/features/finance/dashboard/dashboard.types.ts` (new)

- `type PaceLevel = 'green' | 'yellow' | 'red'`.
- `interface BudgetSummary { expenseBudget: number; expensesRemaining: number; pace: PaceLevel }`.
- `interface FundsSummary { emergency: FundProgress; savings: FundProgress }` (reuses
  `FundProgress` from `@/features/finance/funds/funds.types` — an approved read).
- `interface TopProject { project: Project; pct: number }` (reuses `Project` from
  `projects.types` — approved read; `pct = round(funded/target*100)`).
- `interface DashboardState { todaySpending: number; zeroDay: DayActivityStatus; budget: BudgetSummary | null; funds: FundsSummary | null; topProject: TopProject | null }`
  — the three nullable fields are `null` in learning mode (budgeting hidden). `DayActivityStatus`
  is reused from `expenses.types`.

### Service — `src/features/finance/dashboard/dashboard.service.ts` (new)

- `paceIndicator(spent: number, budget: number, daysRemaining: number): PaceLevel` — **pure**:
  `red` when `spent > budget`; else `yellow` when `budget > 0 && spent / budget >= 0.75` **and**
  `daysRemaining > 0`; else `green`. (Matches CLAUDE: green on track, yellow 75%+ spent with days
  left, red over.) A `budget` of `0` is never yellow/red from a ratio — only `red` if something was
  spent against a zero budget.
- `daysRemainingInMonth(monthISO: string, todayISO: string): number` — **pure**, UTC: last day of
  `monthISO` minus today's day-of-month (0 when `todayISO` is in a later month). Uses
  `Date.UTC(y, m, 0).getUTCDate()`.
- `getDashboardSnapshot(monthISO: string, opts: { includeBudgetData: boolean }): Promise<DashboardState>`
  — composes:
  - **today's spending** (always): `expensesService.getExpensesByDateRange(todayISO, todayISO)` summed
    by `amount` (reuses the existing range query — no new expenses fn).
  - **zero-day status** (always): `expensesService.getDayActivityStatus()`.
  - If `!includeBudgetData` → `{ todaySpending, zeroDay, budget: null, funds: null, topProject: null }`.
  - Else, in parallel: `budgetService.getMonthlyBudget(monthISO)`,
    `fundsService.getOrCreateFunds()` + `getFundProgress`, `projectsService.getProjects()`.
    - `budget = { expenseBudget: mb.breakdown.expenses, expensesRemaining: mb.expensesRemaining,
      pace: paceIndicator(mb.expensesLogged, mb.breakdown.expenses, daysRemaining) }`.
    - `funds = { emergency, savings }` from the two funds mapped through `getFundProgress`.
    - `topProject` = the first `status === 'active'` project (already ordered by `priority_rank`),
      or `null` if none; `pct = round(funded/target*100)`.
  - Imports other features' **services** (the approved cross-feature read mechanism). No JSX, no React.
  - **Watch the 300-line cap** — this file is small; no risk.

### Hooks — `src/features/finance/dashboard/dashboard.hooks.ts` (new)

- `useDashboard(opts: { includeBudgetData: boolean })` — loads `getDashboardSnapshot(currentMonthISO(),
  opts)` into `{ state, loading, error, refresh }`, swallowing errors into `error` like `useFunds`.
  Exposes `refresh` so the screen can re-fetch on focus. Re-runs when `includeBudgetData` changes
  (mode toggle).
- `confirm` for zero-day is **not** re-implemented here — the screen reuses
  `expenses` `useZeroDay().confirm` to avoid duplicating that write, then calls `refresh()`.

### Screen — `src/features/finance/dashboard/DashboardScreen.tsx` (new)

- Props `{ includeBudgetData: boolean }` (supplied by the route from app mode).
- Calls `useDashboard({ includeBudgetData })` and **re-fetches on focus** via expo-router
  `useFocusEffect(useCallback(() => { void refresh(); }, [refresh]))` (CLAUDE: "refreshes on every
  focus").
- Renders, top to bottom: `<BudgetSummaryCard>` + `<FundStatusCard>` + a top-project card **only when
  `state.budget` is non-null** (control mode); a "Today" line (`todaySpending`) always; and a fixed
  `<QuickActionBar>` at the bottom. Loading/error states inline like `FundsOverview`.
- Reuses shared primitives (`Card`, `Typography`, `ProgressBar`) and the `funds` `FundProgressBar`
  for the fund mini-bars (approved read) rather than re-building a bar.

### `BudgetSummaryCard.tsx` (new)

- Props `{ summary: BudgetSummary }`. Shows `formatCurrency(expensesRemaining)` + "remaining this
  month" with a pace dot/stripe coloured by `pace` → `SUCCESS`/`PRIMARY_GREEN` (green), `WARNING`
  (yellow), `DANGER` (red) from `@/constants/colors`. `testID="budget-summary-card"`.

### `FundStatusCard.tsx` (new)

- Props `{ funds: FundsSummary }`. Two compact rows (emergency, savings) each with a label and a
  `FundProgressBar` (savings with no target shows the total, per `getFundProgress` returning
  `pct: null`). `testID="fund-status-card"`.

### `QuickActionBar.tsx` (new)

- Props `{ zeroDay: DayActivityStatus; onConfirmZeroDay: () => void }`. Three actions:
  **Log Expense** → `router.push('/expenses/log')`, **Log Income** → `router.push('/income/log')`,
  **Confirm Zero Day** → `onConfirmZeroDay()` (disabled/hidden when `zeroDay.hasExpenses ||
  zeroDay.zeroDayConfirmed` — nothing to confirm once the day has activity). Uses shared `Button`s.
  `testID`s: `quick-log-expense`, `quick-log-income`, `quick-confirm-zero-day`.

### Route — `src/app/(tabs)/dashboard.tsx` (modified)

- Replace the empty `<View />` with the mode→flag translation and render the screen:
  ```tsx
  import { useAppMode } from '@/features/finance/auth/AppModeProvider';
  import { DashboardScreen } from '@/features/finance/dashboard/DashboardScreen';

  export default function DashboardRoute() {
    const mode = useAppMode();
    return <DashboardScreen includeBudgetData={mode === 'control'} />;
  }
  ```
  This is the same routing-layer app-mode consumption `(tabs)/_layout.tsx` already does — it keeps the
  feature decoupled from `auth`.

### Docs — `src/features/finance/dashboard/CLAUDE.md` (modified)

- Add `dashboard.service.ts` to the Files list and note the learning-mode flag arrives as a route prop
  (`includeBudgetData`), not an `auth` import.

## TDD Anchors

Failing tests first; the slice is done when they pass.

1. **`dashboard.service.test.ts`** — in-memory SQLite:
   - `paceIndicator` (pure): under 75% spent → `green`; ≥75% with days remaining → `yellow`; over
     budget → `red`; exactly at budget → `green` (`>` not `>=` for red); 75% with `daysRemaining === 0`
     → `green` (not yellow).
   - `daysRemainingInMonth` returns the right count for a mid-month day and `0` for a past month.
   - `getDashboardSnapshot` with `includeBudgetData: true`: aggregates today's spending (only today's
     expenses, not the whole month), emergency/savings progress, and the top **active** project
     (skips paused/completed, lowest `priority_rank` wins); `topProject` is `null` with no active
     project.
   - `getDashboardSnapshot` with `includeBudgetData: false`: `budget`, `funds`, `topProject` are all
     `null`; `todaySpending` and `zeroDay` still populated.
2. **`dashboard.hooks.test.ts`** — `useDashboard` resolves to the service result (service mocked),
   defaults the month to `currentMonthISO()`, and `refresh` re-invokes the service.
3. **`DashboardScreen.test.tsx`** — control mode renders all cards; learning mode
   (`includeBudgetData={false}`) renders today's spending + actions but **no** budget/fund/project
   cards; quick actions navigate to `/expenses/log` and `/income/log` (router mocked); empty state
   (no data) renders without crashing.
4. **`BudgetSummaryCard.test.tsx`** — renders the remaining amount; the pace colour matches the
   `pace` prop (green/yellow/red).
5. **`QuickActionBar.test.tsx`** — Confirm Zero Day fires `onConfirmZeroDay`; it is hidden/disabled
   when the day already has an expense or a confirmation.

## Acceptance Check (Done When)

- In **control mode** the Dashboard shows "X FCFA remaining this month" with the correct pace colour,
  emergency-fund and savings progress, the top active project's %, and today's spending.
- In **learning mode** only today's spending and the quick-log actions appear — no budget/fund/project
  cards.
- The action bar opens the expense and income log screens; **Confirm Zero Day** records the zero day
  and disappears once the day has activity.
- Returning to the Dashboard tab after logging elsewhere shows refreshed numbers.
- `npm test` — new tests pass; full suite stays green. `/check-arch` clean (no new cross-feature edge;
  dashboard imports only approved feature services and no `auth`).

## Design Decisions

- **(1) Learning-mode flag is a route prop, not an `auth` import.** Recommended; mirrors VS-08's
  routing-layer gate and keeps dashboard decoupled from auth. *Rejected:* `dashboard → auth` edge +
  `useAppMode()` inside the screen.
- **(2) A pure `paceIndicator` + an aggregating `service.ts`.** Pace is pure and unit-tested directly;
  the DB aggregation is tested with in-memory SQLite; the hook test mocks the one service. Consistent
  with every slice's service/hook split, even though the dashboard owns no tables.
- **(3) Reuse, don't rebuild.** Today's spending uses the existing `getExpensesByDateRange`; fund bars
  reuse `FundProgressBar`/`getFundProgress`; zero-day confirm reuses `expenses` `useZeroDay`. No new
  service functions in other features.
- **(4) Top project = first active by priority.** `getProjects()` already returns priority-ordered
  rows; the dashboard picks the first `active` one. No new query.

## Out of Scope (Deferred)

- **Debt summary card** — approved read, but not in VS-13's KANBAN scope/Done-when. A later slice.
- **Multiple-project / all-funds detail on the home screen** — the dashboard shows the *top* project
  and the two funds only; full lists live in their own tabs.
- **Trends / charts / month-over-month** — owned by VS-14 (Reports).
- **A dedicated zero-day modal on the dashboard** — the action confirms inline via `useZeroDay`; the
  full `ZeroDayPrompt`/`ZeroDayGate` flow (VS-08) stays where it is.

## After This Slice

1. Run `/check-arch` — confirm dashboard imports only approved feature **services** (`expenses`,
   `budget`, `funds`, `projects`) and **no** `auth`; no `app/` import.
2. Invoke `code-reviewer` on the branch diff. Address any `BLOCK`.
3. Mark VS-13 `✅ Done` in `docs/KANBAN.md` with the test count (no migration this slice).
4. Delete `issues/ISSUE-013/` after on-device verification.
