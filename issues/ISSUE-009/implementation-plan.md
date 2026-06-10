# ISSUE-009 — Funds: Emergency Fund & Savings

**Maps to:** KANBAN VS-09
**Priority:** High
**Blocked by:** VS-06 Budget Allocation (✅ Done)

---

## Problem Statement

The budget engine already splits each income into four buckets (emergency_fund, savings, projects,
expenses) and shows the breakdown on the post-income allocation screen — but the emergency-fund and
savings portions go **nowhere**. Confirming an allocation locks the month and routes to the dashboard;
no balance is actually accumulated, and there is no surface that answers "how close am I to my
emergency target?".

VS-09 makes those two buckets real:

1. **Persisted balances.** Two funds (one `emergency`, one `savings`) accumulate their share of every
   confirmed allocation, with a transaction trail (deposits + manual withdrawals).
2. **Progress toward a goal.** The emergency fund has a mandatory target; savings' target is optional.
   The UI shows `current / target — NN%`.
3. **Automatic redistribution.** When the emergency fund reaches its target it stops claiming income:
   its allocation percentage is folded proportionally into the other buckets so future income isn't
   parked in a full fund.

Two constraints shape the design:

- **Deposits are a side effect of confirming an allocation.** The allocation breakdown already computes
  the per-bucket FCFA amounts (`calculateBreakdown`); confirming should deposit the emergency/savings
  amounts to their funds. This is the existing `budget → funds` approved dependency
  (root `CLAUDE.md`: "budget → … funds (redistribution)").
- **Redistribution mutates the locked allocation row — by design.** Allocations are locked per month,
  but redistribution is the *one* documented exception (budget `CLAUDE.md` → "Redistribution Logic").
  It writes the new percentages directly, bypassing `updateAllocation`'s lock guard.

## User Stories

- **As the builder,** when I confirm an income allocation, the emergency-fund and savings amounts from
  the breakdown are deposited to those funds automatically — I don't move money by hand.
- **As the builder,** I can open a Funds screen and see the emergency fund and savings side by side, each
  with its current balance, target, and a progress bar (`320,000 / 500,000 FCFA — 64%`).
- **As the builder,** I can open a fund's detail, see its deposit/withdrawal history, edit its target,
  and log a manual withdrawal with a reason (e.g. an emergency expense).
- **As the builder,** when the emergency fund hits its target, the app stops allocating to it and folds
  that 10% proportionally into savings, projects, and expenses for the current month — automatically.

## Scope

Each bullet maps to a concrete file. Implementation order is top-to-bottom (tests precede implementation
per TDD).

### Constants

- `src/constants/funds.ts` — **new**: closed enums + defaults, mirroring `allocation.ts`/`incomeSources.ts`
  (features import constants; constants never import features).
  - `FUND_TYPE_VALUES = ['emergency', 'savings'] as const`, `type FundType`, `FUND_TYPE_SET`,
    `FUND_TYPE_LABELS`.
  - `TRANSACTION_DIRECTION_VALUES = ['deposit', 'withdrawal'] as const`, `type TransactionDirection`.
  - `DEFAULT_EMERGENCY_TARGET = 500000` (mandatory emergency target seeded on first run; user-editable).
    Savings is seeded with **no** target (`null`). See Design Decision #2.

### Database

- `src/services/migrations/010_create_funds_table.ts` — **new**: `funds` table —
  `id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL UNIQUE CHECK(type IN ('emergency','savings')),
  target_amount INTEGER, current_amount INTEGER NOT NULL DEFAULT 0, is_target_met INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL`. `target_amount` is nullable (savings may have no goal). `UNIQUE(type)` enforces
  one fund per type and makes `getOrCreateFunds` race-safe via `INSERT OR IGNORE` (same pattern as
  `getOrCreateCurrentAllocation`).
- `src/services/migrations/011_create_fund_transactions_table.ts` — **new**: `fund_transactions` table —
  `id INTEGER PRIMARY KEY AUTOINCREMENT, fund_id INTEGER NOT NULL, amount INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('deposit','withdrawal')), reason TEXT, date TEXT NOT NULL,
  created_at TEXT NOT NULL`, plus `CREATE INDEX idx_fund_transactions_fund_id ON fund_transactions(fund_id)`.
- `src/services/migrations/index.ts` — **modified** to register migrations 10 and 11.

### Types — `src/features/finance/funds/funds.types.ts` (new)

- Re-export `FundType`, `TransactionDirection` from `@/constants/funds` (single source of truth lives in
  constants; the slice's documented home is here — mirrors `budget.types.ts` re-exporting `Bucket`).
- `Fund { id: number; type: FundType; targetAmount: number | null; currentAmount: number; isTargetMet: boolean; createdAt: string }`.
- `FundTransaction { id: number; fundId: number; amount: number; direction: TransactionDirection; reason: string | null; date: string; createdAt: string }`.
- `FundProgress { fundId: number; type: FundType; current: number; target: number | null; pct: number | null }`
  (`pct` is `null` when there is no target — savings shows balance only).
- `DepositResult { fund: Fund; targetNewlyMet: boolean }` — returned by `depositToFund` so the caller can
  trigger redistribution exactly once (see Design Decision #1).

### Funds feature — `src/features/finance/funds/`

- `funds.service.ts` — **new**. Pure logic + DB calls, no JSX/React:
  - `getOrCreateFunds(): Promise<Fund[]>` — ensures both rows exist (`INSERT OR IGNORE` emergency with
    `DEFAULT_EMERGENCY_TARGET`, savings with `null` target), returns `[emergency, savings]`.
  - `getFundByType(type): Promise<Fund>` / `getFundById(id): Promise<Fund | null>`.
  - `depositToFund(type: FundType, amount: number, reason: string, dateISO?): Promise<DepositResult>` —
    rejects `amount <= 0`; in one transaction: insert a `deposit` row, `current_amount += amount`,
    recompute `is_target_met` (`target != null && current >= target`); returns whether the target was
    *newly* met (was false, now true) so the caller redistributes once and only once.
  - `withdrawFromFund(id: number, amount: number, reason: string, dateISO?): Promise<Fund>` — rejects
    `amount <= 0` and over-withdrawal (`amount > current_amount`); in one transaction: insert a
    `withdrawal` row, `current_amount -= amount`, and reset `is_target_met = 0` if the balance drops
    below target. (Reverse redistribution of the emergency percentage is **out of scope** — see Deferred.)
  - `updateFundTarget(id: number, target: number | null): Promise<void>` — emergency target must be a
    positive integer (mandatory); savings may be set to `null`. Recomputes `is_target_met`.
  - `getFundProgress(fund: Fund): FundProgress` — pure; `pct = target ? round(current / target * 100) : null`.
  - `getFundTransactions(fundId: number): Promise<FundTransaction[]>` — newest first.
- `funds.hooks.ts` — **new**: `useFunds()` → `{ funds, progress, loading, error, refresh }` (both funds +
  their progress); `useFundDetail(id)` → `{ fund, transactions, loading, error, refresh, withdraw, setTarget }`.
  (KANBAN's `useFundProgress`/`useRedistribution` collapse into these: progress is derived inside `useFunds`;
  redistribution is triggered from the allocation-confirm flow, not a standalone hook — Design Decision #1.)
- `FundProgressBar.tsx` — **new**. Visual bar showing `pct` toward goal; renders a "no target" / balance-only
  state when `target` is `null`. Reuses the shared `ProgressBar` primitive.
- `FundsOverview.tsx` — **new**. Side-by-side emergency + savings cards (balance, target, `FundProgressBar`);
  empty/loading states; each card routes to `/funds/[id]`.
- `FundDetail.tsx` — **new**. One fund: progress, transaction history, an "Edit target" control, and a
  "Log withdrawal" control (amount + reason). Reuses shared `Modal`/`Button`/`TextInput`.
- `FundDetailRoute.tsx` — **new**, mirrors `AllocationFromIncomeRoute`: reads `useLocalSearchParams<{ id }>()`,
  validates, renders `<FundDetail fundId={…} />` (keeps the `app/` route thin — only features touch router hooks).

### Budget feature — additions (the wiring)

- `budget.service.ts` — **modified**: add `redistributeEmergencyPct(monthISO: string): Promise<void>` —
  reads the allocation; if `emergencyFundPct === 0` it's a no-op; otherwise splits the emergency percentage
  proportionally across `savings/projects/expenses` by their current weights using integer-floor division,
  with the rounding remainder added to `expenses` (matching `calculateBreakdown`'s residual-bucket
  convention) so the four still sum to 100; sets `emergency_fund_pct = 0`; **writes the row directly**
  (UPDATE), bypassing the lock guard — redistribution is the documented exception to the per-month lock.
- `AllocationScreen.tsx` — **modified** `handleConfirm`: before locking, deposit the breakdown's
  `emergencyFund` and `savings` amounts to their funds via `funds.service.depositToFund(…, 'Allocation
  <month>')`; if the emergency deposit reports `targetNewlyMet`, call `redistributeEmergencyPct(month)`.
  Then lock and route as today. (`budget → funds` is an approved dependency.)

### Routes

- `src/app/funds/index.tsx` — **new**, thin: renders `<FundsOverview />`.
- `src/app/funds/[id].tsx` — **new**, thin: renders `<FundDetailRoute />`.

### Navigation

- `src/features/finance/budget/BudgetOverview.tsx` — **modified**: add a "Funds" button that
  `router.push('/funds')` (a route string — no cross-feature import). The Budget tab is the natural entry
  point until the Dashboard (VS-13) surfaces fund cards.

## TDD Anchors

Failing tests to write first; the slice is done when they all pass.

1. **`funds.service.test.ts`** — `src/features/finance/funds/__tests__/funds.service.test.ts` (in-memory SQLite):
   - `getOrCreateFunds` creates exactly one emergency (target `500000`) and one savings (target `null`) on
     first call; a second call returns the same two rows (no duplicates).
   - `depositToFund('emergency', 100000, 'x')` increases `current_amount` and writes one `deposit` transaction.
   - `depositToFund` rejects `0` and negative amounts.
   - `is_target_met` flips to `true` exactly when `current >= target`; the crossing deposit returns
     `targetNewlyMet: true`, a further deposit returns `targetNewlyMet: false`.
   - `withdrawFromFund` decreases the balance, writes a `withdrawal` transaction, and rejects over-withdrawal.
   - withdrawing the emergency fund below target after it was met resets `is_target_met` to `false`.
   - `getFundProgress` returns the right `pct` with a target and `pct: null` for a null-target savings fund.
   - `updateFundTarget` rejects a null/zero target for the emergency fund; allows null for savings.

2. **`budget.service.test.ts`** (extended) — redistribution:
   - `redistributeEmergencyPct` on `{emergency:10, savings:10, projects:15, expenses:65}` zeroes emergency
     and splits 10 proportionally; result is all integers and sums to exactly 100.
   - it is a no-op when `emergencyFundPct` is already `0`.
   - it writes through a **locked** allocation (the documented lock exception).

3. **`funds.hooks.test.ts`** — `useFunds` loads both funds + progress and re-fetches on `refresh`;
   `useFundDetail` exposes transactions and `withdraw`/`setTarget` mutations that re-fetch.

4. **`FundsOverview.test.tsx`** — renders both fund cards with balances and progress bars reflecting the
   correct percentages; tapping a card navigates to `/funds/[id]`; shows the empty/loading state.

5. **`FundDetail.test.tsx`** — renders progress + transaction history; "Log withdrawal" calls
   `withdrawFromFund` with the entered amount/reason; "Edit target" calls `updateFundTarget`.

6. **`AllocationScreen.test.tsx`** (extended) — confirming deposits the breakdown's emergency and savings
   amounts to their funds; when the emergency deposit reports `targetNewlyMet`, `redistributeEmergencyPct`
   is invoked once; the month is still locked and routing still happens.

## Acceptance Check (Done When)

- Confirming an income allocation deposits the emergency-fund and savings amounts to their funds; the Funds
  screen shows the updated balances.
- The Funds screen shows emergency and savings side by side, e.g. `320,000 / 500,000 FCFA — 64%`, with
  savings tracking independently.
- Opening a fund shows its transaction history; the target can be edited and a manual withdrawal can be logged.
- When the emergency fund reaches its target, its 10% is automatically redistributed across the other three
  buckets (new percentages sum to 100) and future income stops flowing to it.
- `npm test` — all new/extended test files pass; the full suite stays green.

## Design Decisions

> **⚠️ Decisions (1) and (2) below need your sign-off at the approval checkpoint — they fix the import
> direction between two mutually-dependent features and a seeded product value. Veto either before I implement.**

- **(1) Redistribution is triggered from the budget confirm flow, keeping imports one-directional
  (`budget → funds`).** Both `budget → funds` and `funds → budget` are approved, but wiring *both* creates a
  circular module dependency. So `depositToFund` returns `targetNewlyMet` and the budget `AllocationScreen`
  (which already imports `funds.service` to deposit) calls its **own** `budget.service.redistributeEmergencyPct`.
  `funds.service` never imports `budget`.
  *Note:* the funds `CLAUDE.md` says funds "trigger redistribution in `budget.service`". This plan satisfies
  the *behavior* (target met ⇒ redistribution) while keeping the dependency acyclic. *If you'd rather
  `funds.service` call `budget.service` directly (accepting the circular import), say so.*

- **(2) Funds are seeded by `getOrCreateFunds` (service), not by the migration, with
  `DEFAULT_EMERGENCY_TARGET = 500000` and a null savings target.** Mirrors `getOrCreateCurrentAllocation`
  and `getAppSettings`, and keeps an FCFA amount out of a schema file. `500,000` matches the PRD's worked
  example; the emergency target is mandatory and user-editable, savings' target is optional (`null`).
  *Rejected alt:* seed in the migration. Why rejected: bakes a product value into the schema and complicates
  changing it later. *If you prefer a different default emergency target, name it.*

- **Deposits are a side effect of confirming an allocation, using the already-computed breakdown.**
  `AllocationScreen` already has `breakdown.emergencyFund`/`breakdown.savings`; confirming deposits exactly
  those amounts. *Rejected alt:* a separate "fund the buckets" action — redundant with the existing confirm.

- **Redistribution writes the locked allocation row directly (the documented lock exception) and rounds
  with the remainder to `expenses`.** This matches `calculateBreakdown`'s residual-bucket convention so the
  four percentages always sum to 100, and honours budget `CLAUDE.md`'s "exception to the lock rule —
  redistribution is automatic."

- **Each balance change is a single SQLite transaction** (insert the `fund_transaction` row + update
  `current_amount` + recompute `is_target_met` together), mirroring `runRecurringAutoLog`'s per-row
  transactions — a crash can't leave a transaction trail that disagrees with the balance.

- **Over-withdrawal is rejected in the service.** A withdrawal greater than the current balance throws; funds
  never go negative. *Rejected alt:* clamp to zero silently — hides a user error.

## Out of Scope (Deferred)

- **Reverse redistribution** (restoring the emergency percentage after a withdrawal drops the fund below
  target). VS-09 resets `is_target_met` on such a withdrawal but does **not** automatically restore the
  zeroed `emergency_fund_pct` — doing so correctly means remembering the pre-redistribution percentages.
  Tracked for a follow-up; the funds `CLAUDE.md`'s "resume allocation" note will be revisited then.
- **`category_budgets` table** (per-category subdivision of the expense bucket, mentioned in budget
  `CLAUDE.md`) — unrelated to funds; lands with over-budget work (VS-12) if needed.
- **Dashboard fund cards** (`FundStatusCard`) → VS-13.
- **Double-confirm de-duplication** of the same income's deposit. `AllocationScreen` already guards
  `isConfirming` and `router.replace`s away on success, so re-deposit of one income is not a realistic path;
  linking a deposit to an `income.id` to make it idempotent is deferred.
- **Supabase mirroring** of `funds`/`fund_transactions` → VS-15.

## After This Slice

1. Run `/check-arch` to confirm no dependency-rule violations (special attention: `funds` must **not**
   import `budget`; the only new cross-feature edge is `budget → funds`).
2. Invoke the `code-reviewer` subagent on the branch diff. Address any `BLOCK` findings.
3. Mark VS-09 as `✅ Done` in `docs/KANBAN.md` with the test count and migration numbers (010, 011).
4. Delete `issues/ISSUE-009/` after on-device verification.
