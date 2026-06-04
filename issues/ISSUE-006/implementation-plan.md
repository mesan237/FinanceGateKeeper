# ISSUE-006 — Budget Allocation System

**Maps to:** KANBAN VS-06
**Priority:** Critical
**Blocked by:** VS-03 (✅ Done), VS-05 (✅ Done)

---

## Problem Statement

VS-05 made income loggable; VS-03 made expenses loggable. Neither knows about the other yet. Without an allocation engine, every franc of income is undifferentiated — there is no "Emergency Fund", no "Savings", no "Projects" budget, and no answer to *"how much do I have left to spend this month?"*. This slice introduces the central allocation logic that all later slices depend on: VS-09 funds, VS-10 projects, VS-12 over-budget alerts, VS-13 dashboard, and VS-14 reports all read budget state.

Three constraints shape the design:

1. **Allocation is by percentage, not amount.** Income is irregular (salary + freelance + e-commerce), so a fixed-amount allocation would under- or over-shoot every month. Percentages adapt.
2. **Allocations are locked per month** once confirmed — otherwise the user can rewrite history by editing past months, and "remaining budget" becomes meaningless.
3. **VS-06 owns *math* only, not the actual money movement into funds/projects.** Funds get implemented in VS-09; projects in VS-10. This slice records the allocation breakdown and exposes it; the deposit flows are wired in their own slices.

## User Stories

- **As the builder,** after logging income I land on an Allocation Screen that shows where the money is going: *Emergency Fund 10% (40,000), Savings 10% (40,000), Projects 15% (60,000), Expenses 65% (260,000)*. I confirm and the budget tab reflects the new month's expense budget.
- **As the builder,** I can open Budget Settings, change my expense percentage from 65% to 60% (and savings 10% → 15%) **only if the current month isn't locked yet**. If it is locked, the screen tells me so and the fields are read-only.
- **As the builder,** I can reorder the four buckets so my priority view goes Projects → Expenses → Savings → Emergency, and the AllocationScreen renders in my order.
- **As the builder,** I can open the Budget tab and see at a glance how much of this month's expense budget is left after the expenses I have already logged.

## Scope

Each bullet maps to a concrete file. Implementation order is top-to-bottom (tests precede implementation per TDD).

### Database

- `src/services/migrations/005_create_allocations_table.ts` — creates `allocations` table: `id INTEGER PRIMARY KEY AUTOINCREMENT, month TEXT NOT NULL UNIQUE, emergency_fund_pct INTEGER NOT NULL, savings_pct INTEGER NOT NULL, projects_pct INTEGER NOT NULL, expenses_pct INTEGER NOT NULL, priority_order TEXT NOT NULL, is_locked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL`. `UNIQUE(month)` enforces one row per month. Index on `(month)` for the dominant lookup pattern.
- `src/services/migrations/index.ts` — append the new migration to the registry (id 5).

### Constants

- `src/constants/allocation.ts` — exports:
  - `BUCKET_VALUES: readonly ['emergency_fund', 'savings', 'projects', 'expenses']` (`as const`).
  - `Bucket` type derived from the tuple.
  - `BUCKET_LABELS: Record<Bucket, string>` — "Emergency Fund", "Savings", "Projects", "Expenses".
  - `DEFAULT_ALLOCATION: { emergencyFundPct: 10, savingsPct: 10, projectsPct: 15, expensesPct: 65, priorityOrder: ['emergency_fund', 'savings', 'projects', 'expenses'] }`.

### Feature Slice — `src/features/finance/budget/`

- `budget.types.ts` — exports:
  - `Bucket` re-exported from the constant.
  - `Allocation { id: number; month: string; emergencyFundPct: number; savingsPct: number; projectsPct: number; expensesPct: number; priorityOrder: Bucket[]; isLocked: boolean; createdAt: string }`.
  - `AllocationDraft = Omit<Allocation, 'id' | 'createdAt' | 'isLocked'>` — what the settings screen edits.
  - `AllocationBreakdown { emergencyFund: number; savings: number; projects: number; expenses: number }`.
  - `MonthlyBudget { month: string; incomeTotal: number; allocation: Allocation; breakdown: AllocationBreakdown; expensesLogged: number; expensesRemaining: number }`.
- `budget.service.ts` — exports:
  - `getOrCreateCurrentAllocation(monthISO: string): Promise<Allocation>` — returns the row for `monthISO`, creating it with `DEFAULT_ALLOCATION` if absent. Idempotent.
  - `getAllocation(monthISO: string): Promise<Allocation | null>` — pure read, no auto-create.
  - `updateAllocation(monthISO: string, draft: AllocationDraft): Promise<void>` — writes percentages and priority order. **Throws** if percentages don't sum to exactly 100, if any percentage is negative, if the priority order isn't a permutation of the four buckets, or if the month is already locked.
  - `lockAllocation(monthISO: string): Promise<void>` — flips `is_locked` to 1. Idempotent.
  - `calculateBreakdown(incomeAmount: number, allocation: Allocation): AllocationBreakdown` — pure math. Splits `incomeAmount` by the four percentages, using integer floors and assigning the rounding remainder to the `expenses` bucket so the four amounts sum to `incomeAmount` exactly.
  - `getMonthlyBudget(monthISO: string): Promise<MonthlyBudget>` — composes income total, allocation, breakdown computed against income, expenses logged for the month, and remaining expense budget.
  - `getExpensesMonthlyTotal(monthISO: string): Promise<number>` — sums expense amounts for the month. **Lives here, not in `expenses.service.ts`**, because `budget` is the consumer (per the approved cross-feature dep `budget → expenses`).
- `budget.hooks.ts` — exports:
  - `useAllocation(monthISO: string)` — `{ allocation, loading, error, save, lock, refresh }`. `save(draft)` validates and calls `updateAllocation`; bubbles up the error message rather than throwing into the UI.
  - `useBudgetStatus(monthISO: string)` — `{ budget, loading, error, refresh }`. Re-loads on demand (mounted, after income/expense changes are logged).
- `AllocationSettings.tsx` — four numeric inputs (one per bucket) with a live "Total: NN%" indicator. A "Reorder priority" section shows the four buckets in order with **up/down arrows** per row (no drag-and-drop library; rationale below). "Save" button is disabled until the four percentages sum to 100. If the month is already locked, the inputs and reorder controls are read-only and a "Locked for this month" banner is shown above.
- `BudgetOverview.tsx` — the body of the Budget tab. Renders for the current month: the four buckets with their *calculated amounts* against current income, the *expenses remaining* number prominently, a lock-status indicator, and an "Edit allocation" button that navigates to `/budget/settings`. When no income is logged yet, shows a muted empty-state message instead of a 0-FCFA breakdown.
- `AllocationScreen.tsx` — props `{ amountFCFA: number; monthISO: string }`. Loads (or creates) the allocation for the month, renders the breakdown with each bucket labeled and totaled, plus a "Confirm" button. Confirm calls `lockAllocation(monthISO)` then navigates to `/(tabs)/dashboard` via `router.replace`. The screen does **not** edit percentages — that lives in Settings.

### Routes

- `src/app/budget/settings.tsx` — thin route rendering `<AllocationSettings />`.
- `src/app/(tabs)/budget.tsx` — replaces the placeholder `<View />` with `<BudgetOverview />`.
- `src/app/income/allocate.tsx` — thin route. Reads `?amount=<N>&month=<YYYY-MM>` from search params, validates them, and renders `<AllocationScreen amountFCFA={…} monthISO={…} />`. If the params are missing or invalid, renders a muted error message — never crashes.

### Wire-up: Income → Allocate

- `src/features/finance/income/IncomeLogScreen.tsx` — `handleSave` is rewritten:
  1. Capture `persistedAmount = Math.trunc(Number(log.amount))` and `persistedMonth = log.date.slice(0, 7)` **before** calling `submit`.
  2. `const id = await log.submit()`.
  3. If `id !== null`, `router.push({ pathname: '/income/allocate', params: { amount: String(persistedAmount), month: persistedMonth } })`.
  4. The inline recent-income list (and its refresh) is **removed** since the user navigates away on success. (Recent income lives in the History route under VS-14; until then it's gone from this screen.)

## TDD Anchors

These are the failing tests to write first. The slice is Done when they all pass and no existing test regressed.

1. **`budget.service.test.ts`** — `src/features/finance/budget/__tests__/budget.service.test.ts`:
   - `getOrCreateCurrentAllocation('2026-06')` creates a row with `DEFAULT_ALLOCATION` when none exists; calling it twice returns the same row (not a duplicate).
   - `getAllocation` returns `null` for a missing month, the row for an existing one.
   - `updateAllocation` rejects a draft whose percentages don't sum to 100, a negative percentage, a duplicate or missing bucket in `priorityOrder`, and any save when the month is locked. None of these write a row.
   - `updateAllocation` writes a valid draft and a subsequent `getAllocation` returns the new values.
   - `lockAllocation` flips `is_locked` to true; calling twice is a no-op.
   - `calculateBreakdown(400000, default)` returns `{ emergencyFund: 40000, savings: 40000, projects: 60000, expenses: 260000 }` and the four numbers sum to `400000`.
   - `calculateBreakdown(100001, default)` distributes the rounding remainder into `expenses` so the four amounts sum exactly to `100001`.
   - `calculateBreakdown(0, …)` returns `{ 0, 0, 0, 0 }`.
   - `getExpensesMonthlyTotal('2026-06')` sums only that month's expenses; returns 0 when none match.
   - `getMonthlyBudget('2026-06')` after logging two incomes (350k Salary, 75k Freelance) and two expenses (5k, 12k) reports `incomeTotal: 425000`, `breakdown.expenses: 276250` (65%), `expensesLogged: 17000`, `expensesRemaining: 259250`.

2. **`budget.hooks.test.ts`** — `src/features/finance/budget/__tests__/budget.hooks.test.ts`:
   - `useAllocation('2026-06')` loads the row (auto-creating it on first use) and exposes it via `allocation`.
   - `save({…valid draft})` updates and re-reads; a subsequent render sees the new values.
   - `save({…invalid percentages})` does not modify state and sets `error` to a non-null message.
   - `save({…})` on a locked allocation sets `error` and does not mutate.
   - `useBudgetStatus('2026-06')` exposes `budget` matching `getMonthlyBudget`; calling `refresh()` re-reads it.

3. **`AllocationSettings.test.tsx`** — `src/features/finance/budget/__tests__/AllocationSettings.test.tsx`:
   - Renders four numeric inputs with bucket labels and the current allocation's values.
   - The Save button is disabled when the four inputs don't sum to 100, enabled when they do.
   - Tapping the up arrow on a bucket row moves it one position earlier in the priority list; tapping down moves it later. The top row's up arrow is a no-op (and exposes `accessibilityState.disabled`).
   - When the loaded allocation `isLocked`, inputs are `editable: false`, arrows are disabled, and the "Locked for this month" banner is rendered.

4. **`AllocationScreen.test.tsx`** — `src/features/finance/budget/__tests__/AllocationScreen.test.tsx`:
   - Given `amountFCFA={400000}` and the default allocation, the four bucket rows render their labels and the correct amounts (`40 000`, `40 000`, `60 000`, `260 000`), and the rows appear in the allocation's `priorityOrder`.
   - The Confirm button is rendered enabled when an allocation is loaded.
   - Pressing Confirm calls `lockAllocation('2026-06')` exactly once and triggers `router.replace('/(tabs)/dashboard')`. Mock `expo-router`.

5. **`BudgetOverview.test.tsx`** — `src/features/finance/budget/__tests__/BudgetOverview.test.tsx`:
   - After logging income of `400 000` and two expenses totalling `12 000`, the overview shows `Expenses remaining: 248 000` and the four bucket rows in priority order with their calculated amounts.
   - When no income exists for the current month, the breakdown rows are hidden and a muted empty state ("Log income to start tracking your budget.") is rendered.
   - The "Edit allocation" button is present and, when tapped, calls `router.push('/budget/settings')`.

## Acceptance Check (Done When)

- `npx expo start` boots without errors. The Budget tab is reachable from the tab bar.
- Logging `400 000 FCFA · Salary` for today routes me to `/income/allocate?amount=400000&month=YYYY-MM`. The screen shows: *Emergency Fund 40 000 · Savings 40 000 · Projects 60 000 · Expenses 260 000*. Pressing Confirm sends me to the Dashboard tab.
- The Budget tab now shows *Expenses remaining: 260 000 FCFA*, the four bucket rows, and a "Locked for this month" indicator.
- Logging an expense of `12 000 FCFA` against any category, then re-opening the Budget tab, shows *Expenses remaining: 248 000 FCFA* (re-computed from `260 000 − 12 000`).
- Opening Budget Settings shows the percentages as read-only with the "Locked for this month" banner (because Confirm locked the month). The Save button is disabled.
- All five test files pass; full suite remains green.

## Design Decisions (Locked During Grill Me)

- **Allocation table is the only new table; `category_budgets` is deferred.** Rejected alt: ship per-category sub-allocation now. Why deferred: KANBAN VS-06 scope says "get remaining expense budget (total income × expense_pct − total expenses)" — that's overall, not per-category. Per-category budgets show up in VS-12 (over-budget alerts) or a dedicated polish slice. CLAUDE.md describes the eventual end state; this slice ships the minimum that satisfies the Done When.
- **Percentages are stored as integers (0–100), not floats.** Rejected alt: decimal percentages. Why: matches every other amount in the schema (integers, FCFA, no decimals) and removes any rounding fragility at storage time. Rounding only happens in `calculateBreakdown`, where the remainder is assigned to the `expenses` bucket so the four amounts always sum to the input exactly.
- **`priority_order` is a TEXT column holding a JSON-stringified array.** Rejected alt: four `*_order` integer columns. Why: a JSON array preserves the ordering as a single value, is trivially serializable from/to the `Bucket[]` type, and avoids a multi-column update for a single reorder. Validation (must be a permutation of the four buckets) lives in `updateAllocation`.
- **Reorder UI uses up/down arrows, not drag-to-drop.** Rejected alt: `react-native-draggable-flatlist`. Why: drag-to-reorder needs a new dependency and per-platform gesture wiring (touchables vs. mouse); arrows are testable with one tap, satisfy the UX outcome ("change my priority order"), and don't add a library. If a future polish slice needs true drag we promote then.
- **`lockAllocation` is the *only* mutation that runs on Confirm.** Rejected alt: also deposit into Emergency Fund / Savings / Project records. Why: deposits live in VS-09 (funds) and VS-10 (projects) — those slices implement the actual fund rows and the deposit transactions. VS-06 records the *plan*, not the *movement*. When VS-09 lands, AllocationScreen Confirm will be extended to call `funds.service.deposit(...)` and `projects.service.deposit(...)`.
- **`updateAllocation` rejects on a locked month; `getOrCreateCurrentAllocation` does not auto-unlock.** A new month always starts unlocked by virtue of being a new row. There's no "unlock" service method in this slice — by design, locked months are immutable until the next month rolls over. If we ever need a "redo this month" affordance, it ships as an explicit feature, not a silent reset.
- **The income screen captures `persistedAmount` *before* calling `submit` rather than the hook exposing the value.** Rejected alt: extend `useIncomeLog.submit()` to return `{ id, amount } | null`. Why: changing the hook's return type would break VS-05's tests and gain little — the screen already owns the input string and can `Math.trunc(Number(...))` it before submit. Capturing-before-submit also means the hook's existing reset-on-success behavior stays untouched.
- **The Allocation screen reads `amount` and `month` from search params, not from a draft store.** Rejected alt: a `useAllocationDraft` context populated on income save. Why: search params are persistent across reload, debug-friendly, copy-pasteable, and need no new state plumbing. The screen tolerates missing/invalid params (renders an error message) so a stray manual navigation can't crash.
- **`getExpensesMonthlyTotal` lives in `budget.service`, not `expenses.service`.** Per the approved cross-feature dep table, `budget` reads from `expenses`. Adding the helper to `expenses.service` would make it look like an expenses concern; putting it in `budget.service` keeps the *consumer* responsible for shaping the data it needs.
- **Recent-income inline list is removed from `IncomeLogScreen`.** Rejected alt: keep it as a back-navigation safety net. Why: the canonical flow is now log → allocate → confirm → dashboard; the recent list is dead code on this path. Its proper home is a dedicated Income History route or VS-14 Reports. The VS-05 test that asserts the list appearing after save will be updated to assert navigation happens instead.

## Out of Scope (Deferred)

- Per-category expense sub-budgets (`category_budgets` table) → VS-12 (over-budget alerts) or a dedicated polish slice.
- Funds deposit on confirm (`emergencyFund.deposit(...)`, `savings.deposit(...)`) → VS-09.
- Project deposit on confirm with priority-split logic → VS-10.
- Auto-redistribution when an emergency fund hits target → VS-09 (will mutate the locked allocation as a documented exception).
- Dedicated income history route (replacement for the removed inline list) → VS-14 Reports or a small polish slice.
- Dashboard "remaining at a glance" tile → VS-13 (reads `useBudgetStatus`).
- App-mode gating ("Learning Mode hides allocation") → VS-08.

## After This Slice

1. Run `/check-arch` to confirm no dependency-rule violations.
2. Invoke the `code-reviewer` subagent on the branch diff. Address any `BLOCK` findings.
3. Mark VS-06 as `✅ Done` in `docs/KANBAN.md` with the test count and the migration number.
4. Delete `issues/ISSUE-006/` (or move it under `issues/done/`) per the doc-rot rule.
