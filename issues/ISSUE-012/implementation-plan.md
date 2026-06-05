# ISSUE-012 — Over-Budget Alerts

**Maps to:** KANBAN VS-12
**Priority:** High
**Blocked by:** VS-03 Expense Logging (✅ Done) and VS-06 Budget Allocation (✅ Done) — both
complete. This slice adds **one new cross-feature edge** (`expenses → budget`, read-only) to the
approved table, mirroring how VS-10 added `budget → projects`.

---

## Scope Decision (settled before drafting)

The KANBAN wording ("This puts you 3,200 FCFA over your **Food** budget") and `budget/CLAUDE.md`
describe a **per-category** budget backed by a `category_budgets` table. **That table was never
built** — VS-06 shipped only the overall monthly expense allocation (`allocations` table +
`expensesRemaining = income × expenses_pct − total expenses`, already computed by
`getMonthlyBudget`). There is no per-category budget data anywhere in the DB.

**Decision (approved): VS-12 checks against the overall monthly expense allocation only.** No new
table, no per-category budget-setting UI. Per-category budgets are deferred to a follow-up slice.
This keeps VS-12 a thin, honest slice over the data that actually exists. (Rejected: build
`category_budgets` + a per-category budget editor now — roughly doubles the slice and adds a whole
screen for data the rest of the app doesn't yet consume.)

---

## Problem Statement

Today an expense always saves silently, even when it blows the month's expense budget. The user only
discovers the overspend later (in a report that doesn't exist yet) or never. VS-12 adds a
**pre-save guard**: before any expense is committed — from the manual form *or* a one-tap Quick-Add
tile — the app checks whether it would push the month's total expenses past the confirmed expense
allocation. If so, it shows an in-app modal with the exact overage and lets the user **Proceed** or
**Cancel**.

Two constraints shape the design:

1. **The alert is in-app only, never a push** (`notifications/CLAUDE.md`). The trigger file is a
   pure payload builder; the modal renders its copy. No notification is scheduled.
2. **The check is meaningful only once the month's allocation is confirmed.** Confirming an
   allocation **locks** the month (`AllocationScreen` → `useAllocation().lock`). In learning mode the
   user never confirms an allocation, and in control mode the month may not be set up yet — in both
   cases the auto-materialised default allocation stays unlocked. So `checkOverBudget` returns
   *not over* whenever `allocation.isLocked` is false. This gates the alert correctly **without the
   budget feature importing the auth/app-mode feature** (which the cross-feature table forbids).

## User Stories

- **As the user,** when I try to log an expense that fits my remaining expense budget, it saves with
  no interruption (no extra tap, no modal).
- **As the user,** when an expense would exceed my monthly expense budget, I see "This expense puts
  you 3,000 FCFA over your monthly expense budget" with **Proceed** and **Cancel**.
- **As the user,** tapping **Proceed** saves the expense anyway; tapping **Cancel** returns me to the
  form (or aborts the Quick-Add tap) with nothing saved.
- **As the user in learning mode** (or before I've confirmed this month's allocation), I never see
  the over-budget modal — budgeting isn't active yet.
- **As a Quick-Add user,** the same guard runs on a one-tap tile: an over-budget tile prompts before
  it logs.

## Scope

Each bullet maps to a concrete file. Order is top-to-bottom (tests precede implementation per TDD).

### Types — `src/features/finance/budget/budget.types.ts` (modified)

- Add `OverBudgetCheck { isOver: boolean; overage: number; remaining: number; expenseBudget: number }`
  — `overage` is `0` when not over; `remaining` is the expense budget left **before** this expense;
  `expenseBudget` is the month's `breakdown.expenses`.

### Service — `src/features/finance/budget/budget.service.ts` (modified)

- `checkOverBudget(monthISO: string, newExpenseAmount: number): Promise<OverBudgetCheck>` — composes
  on top of the existing `getMonthlyBudget`:
  - If `budget.allocation.isLocked === false` → return `{ isOver: false, overage: 0, remaining:
    budget.expensesRemaining, expenseBudget: budget.breakdown.expenses }` (guard not active yet).
  - Else `after = budget.expensesLogged + newExpenseAmount`; `isOver = after > breakdown.expenses`;
    `overage = isOver ? after − breakdown.expenses : 0`.
  - DB-only, no JSX. **Watch the 300-line cap** (file is ~264 lines; the addition is ~25). If it
    crosses 300, extract to `budget.overbudget.ts` and re-export — the exact pattern already used for
    `budget.redistribution.ts`.

### Hooks — `src/features/finance/budget/budget.hooks.ts` (modified)

- `useOverBudgetCheck(monthISO?: string)` — defaults `monthISO` to `currentMonthISO()`; returns
  `{ check }` where `check(amount: number) => Promise<OverBudgetCheck>` delegates to
  `budgetService.checkOverBudget`. A thin imperative hook (no loaded state) because callers run it
  on-demand at save time, not on mount.

### Over-budget modal — `src/features/finance/budget/OverBudgetAlert.tsx` (new)

- Props `{ visible: boolean; overage: number; onProceed: () => void; onCancel: () => void }`.
- Renders the shared `Modal` with `Typography` body = `buildOverBudgetAlert({ overage }).body`
  (single source of copy) and two `Button`s: **Proceed** (`onProceed`) and **Cancel** (`onCancel`).
  Reuses only existing primitives (`Modal`, `Typography`, `Button`).

### Notification trigger — `src/notifications/triggers/overBudget.ts` (new, pure)

- `buildOverBudgetAlert(input: OverBudgetInput): NotificationPayload` with local
  `OverBudgetInput { overage: number }` (no `features/` import — the `ProjectTimelineInput` pattern).
  `type: 'overBudget'`, `title: MESSAGES.overBudget.title`, `body` composing
  `formatCurrency(overage)` into the over-budget sentence. No DB, no scheduling. (`NotificationType`
  already includes `overBudget` and `MESSAGES.overBudget` already exists — no config change.)

### Wiring — expenses screens (modified)

- `src/features/finance/expenses/ExpenseLogScreen.tsx` — on **Save**: run
  `check(Math.trunc(Number(amount)))` first. If `isOver`, stash the result in local state and show
  `<OverBudgetAlert>` instead of saving; **Proceed** clears it and runs the existing `log.submit()`
  → `router.replace('/(tabs)/transactions')`; **Cancel** just clears it. If not over, save as today.
- `src/features/finance/expenses/QuickAddScreen.tsx` — before `log(template.id)`, run
  `check(template.amount)`. If `isOver`, show `<OverBudgetAlert>`; **Proceed** runs the existing
  `log` + toast; **Cancel** aborts the tap. If not over, log instantly as today.

### Architecture amendment (required — `/check-arch` enforces it)

- `docs/ARCHITECTURE.md` and root `CLAUDE.md` — add **`expenses → budget`** (reads the over-budget
  check) to the approved cross-feature table. Without this the new import is a violation. (VS-10 set
  the precedent by adding `budget → projects`.)

## TDD Anchors

Failing tests written first; the slice is done when they pass.

1. **`budget.service.test.ts` (extended)** — in-memory SQLite:
   - Locked allocation: an expense that stays under `breakdown.expenses` → `isOver: false`,
     `overage: 0`; an expense that exceeds it → `isOver: true` with the exact overage; an expense
     landing *exactly* on the budget → not over (`>` not `>=`).
   - **Unlocked** allocation → always `isOver: false` regardless of amount (the learning-mode /
     unconfirmed gate).
2. **`overBudget.test.ts`** — `buildOverBudgetAlert({ overage })` returns `type: 'overBudget'`, the
   `MESSAGES.overBudget` title, and a body containing the formatted overage.
3. **`budget.hooks.test.ts` (extended)** — `useOverBudgetCheck().check(amount)` resolves to the
   service result (service mocked); defaults the month to `currentMonthISO()`.
4. **`OverBudgetAlert.test.tsx`** — renders the overage; **Proceed** fires `onProceed`, **Cancel**
   fires `onCancel`; hidden when `visible={false}`.
5. **`ExpenseLogScreen.test.tsx` (extended)** — an under-budget save skips the modal and calls the
   service once; an over-budget save shows the modal and does **not** save until **Proceed**;
   **Cancel** leaves nothing saved.
6. **`QuickAddScreen.test.tsx` (extended)** — an over-budget tile tap shows the modal and logs only
   after **Proceed**; an under-budget tap logs instantly with no modal.

## Acceptance Check (Done When)

- With a **confirmed** allocation leaving 5,000 FCFA of expense budget, logging 8,000 FCFA shows
  "This expense puts you 3,000 FCFA over your monthly expense budget"; **Proceed** saves it,
  **Cancel** doesn't.
- An expense that fits the remaining budget saves with no modal.
- In learning mode, or before the month's allocation is confirmed, no over-budget modal ever appears.
- The same guard runs from the Quick-Add grid.
- `npm test` — new/extended tests pass; full suite stays green. `/check-arch` clean (with the
  `expenses → budget` edge added).

## Design Decisions

- **(1) Overall expense-allocation check, not per-category.** ✅ Approved (see Scope Decision). No
  `category_budgets` table or budget-setting UI in this slice.
- **(2) Gate the check on `allocation.isLocked`, not on app mode.** Confirming an allocation locks
  the month; learning mode and unconfigured months stay unlocked. So the budget feature decides
  "is the guard active?" from its own data and never imports the auth/app-mode feature (which the
  cross-feature table forbids anyway). *Rejected:* thread `appMode` into the expense screens from the
  route layer — adds plumbing and couples expenses to auth for a signal the budget data already
  carries.
- **(3) `expenses → budget` is a direct module edge, not navigation.** The income→budget coordination
  is done via routing (`/income/allocate`), but a pre-save guard must run synchronously and return
  data to decide whether to show a modal — navigation can't express that. So the expense screens
  import `useOverBudgetCheck` + `OverBudgetAlert` from budget, and the approved table gains
  `expenses → budget` (read-only). *Rejected:* a route-level render-prop wrapper injecting the guard
  — keeps the table unchanged but pushes orchestration logic into thin routes.
- **(4) The trigger stays a pure builder; the modal renders its copy.** The over-budget alert is
  in-app only (`notifications/CLAUDE.md`), so `overBudget.ts` formats the message (reused by the
  modal) and schedules nothing — consistent with `projectTimeline`/`debtDueDate`.

## Out of Scope (Deferred)

- **Per-category budgets** (`category_budgets` table + a per-category budget editor + per-category
  overage). A follow-up slice; `budget/CLAUDE.md` already anticipates it.
- **"Log the override for the monthly report"** (KANBAN). There is no report store yet — VS-14
  (Reports) owns persisting and surfacing override events. VS-12 stops at the modal decision.
- **Over-income / total-budget (all buckets) warnings** — VS-12 guards the **expense** bucket only.
- **Editing an existing expense** through the guard — only new expenses (manual + Quick-Add) are
  guarded; there's no expense-edit screen yet.

## After This Slice

1. Run `/check-arch` — confirm the only new cross-feature edge is `expenses → budget` and it's in the
   approved table; `notifications/` imports no `features/`.
2. Invoke `code-reviewer` on the branch diff. Address any `BLOCK` (watch the 300-line cap on
   `budget.service.ts` — extract `budget.overbudget.ts` if needed).
3. Mark VS-12 `✅ Done` in `docs/KANBAN.md` with the test count (no migration this slice).
4. Delete `issues/ISSUE-012/` after on-device verification.
