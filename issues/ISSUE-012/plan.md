# ISSUE-012 — Phase 2 Implementation Plan (Over-Budget Alerts)

Derived from `implementation-plan.md`. Smallest slice so far: **no migration, no new feature folder**
— it extends the existing `budget` service/hooks/types, adds one modal + one pure trigger, and wires
two existing expense screens. Closest analogs: the `projectTimeline` trigger (pure payload builder)
and the `ZeroDayPrompt` modal (Modal + two Buttons gated on a boolean).

Both scope decisions are **approved** (no open questions): overall expense-allocation check only
(no `category_budgets`), and the alert is gated on `allocation.isLocked`.

**Cross-feature edge:** this slice adds `expenses → budget` (read-only). It must be added to the
approved table in `docs/ARCHITECTURE.md` + root `CLAUDE.md`, or `/check-arch` fails.

---

## Build order (TDD: each test written and red before its implementation)

### Subtask 1 — Type
- **Impl (no standalone test; covered by Subtask 2):** add `OverBudgetCheck { isOver; overage;
  remaining; expenseBudget }` to `src/features/finance/budget/budget.types.ts`.

### Subtask 2 — `checkOverBudget` service fn (the core)
- **Test (red):** extend `src/features/finance/budget/__tests__/budget.service.test.ts` (existing
  in-memory better-sqlite3 harness). Cases:
  - locked allocation, under budget → `isOver:false, overage:0`;
  - locked, over budget → `isOver:true` with exact overage;
  - locked, lands exactly on budget → not over (`>`, not `>=`);
  - **unlocked** allocation → always `isOver:false` (the gate).
  Seed via the existing income + `updateAllocation`/`lockAllocation` helpers already used in that
  test file.
- **Impl:** add `checkOverBudget(monthISO, newExpenseAmount)` to `budget.service.ts`, composing on
  `getMonthlyBudget` (early-return when `!allocation.isLocked`). **Mind the 300-line cap** (~264 now;
  ~+25). If it crosses, move the body to `budget.overbudget.ts` and re-export from `budget.service`
  (mirrors `budget.redistribution.ts`).

### Subtask 3 — `overBudget` trigger (pure)
- **Test (red):** `src/notifications/triggers/__tests__/overBudget.test.ts` — `type:'overBudget'`,
  `MESSAGES.overBudget.title`, body contains `formatCurrency(overage)`.
- **Impl:** `src/notifications/triggers/overBudget.ts` — local `OverBudgetInput { overage }`,
  `buildOverBudgetAlert(input)`. Imports `MESSAGES` + `formatCurrency` only (utils/constants allowed;
  no `features/`).

### Subtask 4 — `useOverBudgetCheck` hook
- **Test (red):** extend `src/features/finance/budget/__tests__/budget.hooks.test.ts` (service
  mocked) — `check(amount)` resolves to the mocked service result; month defaults to
  `currentMonthISO()`.
- **Impl:** add `useOverBudgetCheck(monthISO?)` to `budget.hooks.ts` — imperative `{ check }`, no
  mount-time load.

### Subtask 5 — `OverBudgetAlert` modal
- **Test (red):** `src/features/finance/budget/__tests__/OverBudgetAlert.test.tsx` — renders the
  overage; **Proceed**/**Cancel** fire their callbacks; nothing rendered when `visible={false}`.
- **Impl:** `src/features/finance/budget/OverBudgetAlert.tsx` — `{ visible; overage; onProceed;
  onCancel }`; `Modal` + `Typography` (body from `buildOverBudgetAlert`) + two `Button`s.

### Subtask 6 — Wire the expense screens
- **Tests (red):**
  - extend `ExpenseLogScreen.test.tsx`: under-budget save → no modal, one service call; over-budget
    save → modal shown, no save until **Proceed**; **Cancel** → nothing saved.
  - extend `QuickAddScreen.test.tsx`: over-budget tile tap → modal, logs only after **Proceed**;
    under-budget tap → instant log, no modal. (Mock `useOverBudgetCheck`.)
- **Impl:**
  - `ExpenseLogScreen.tsx` — add `useOverBudgetCheck`; `handleSave` runs `check` first, stashes an
    over result in local state to show `<OverBudgetAlert>`, else saves; Proceed → existing
    `log.submit()` + redirect.
  - `QuickAddScreen.tsx` — `handleLog` runs `check(template.amount)` first; over → modal (remember
    which template), Proceed → existing `log` + toast; under → log instantly.

### Subtask 7 — Architecture amendment + gate
- Add `expenses → budget` (over-budget read) to the cross-feature table in `docs/ARCHITECTURE.md` and
  root `CLAUDE.md`.
- Run `/check-arch` inline (expect clean once the edge is listed; `notifications/` imports no
  feature; routes untouched). Then `code-reviewer` on the branch diff.
- Mark VS-12 `✅ Done` in `docs/KANBAN.md` with the test count (no migration).

## Files (6 modified, 2 new)

**New:** `budget/OverBudgetAlert.tsx`; `notifications/triggers/overBudget.ts`. Plus 1 new test file
(`overBudget.test.ts`) and 1 new screen-test file (`OverBudgetAlert.test.tsx`).
**Modified:** `budget/budget.types.ts`, `budget/budget.service.ts` (+ test), `budget/budget.hooks.ts`
(+ test), `expenses/ExpenseLogScreen.tsx` (+ test), `expenses/QuickAddScreen.tsx` (+ test),
`docs/ARCHITECTURE.md` + root `CLAUDE.md` (cross-feature table). *(Possible: new `budget.overbudget.ts`
only if the service crosses the 300-line cap.)*

## Design decisions made during planning (with rejected alternatives)

1. **Overall expense-allocation check, not per-category.** The `category_budgets` table in
   `budget/CLAUDE.md` was never built; only the overall expense allocation exists. *Rejected:* build
   the table + a per-category budget editor now — ~2× the slice, for data nothing else consumes yet.

2. **Gate on `allocation.isLocked`, computed inside the budget feature — not on app mode.** Confirming
   an allocation locks the month; learning mode / unconfigured months stay unlocked, so the guard is
   inert there. This needs no `auth` import (forbidden by the cross-feature table). *Rejected:* thread
   `appMode` from the route layer into the expense screens — extra plumbing, couples expenses↔auth.

3. **`expenses → budget` as a real module edge.** A pre-save guard must run synchronously and return
   data; navigation (how income→budget is wired) can't. So expense screens import the hook + modal and
   the approved table grows by one edge — exactly how VS-10 added `budget → projects`. *Rejected:*
   route-level render-prop injection — keeps the table static but thickens thin routes.

4. **Trigger is a pure builder; the modal renders its copy.** Over-budget is in-app only, so
   `overBudget.ts` formats the message (single source, reused by the modal) and schedules nothing.

5. **`useOverBudgetCheck` is imperative (`{ check }`), not a mount-load hook.** The screens call it at
   save time with the typed amount, not on render. *Rejected:* a `useEffect`-driven hook keyed on a
   live amount — re-runs a DB read on every keystroke for no benefit.

## Done when
All 6 test files (2 new, 4 extended) green and the full suite stays green; `expenses → budget` is in
the approved table and `/check-arch` is clean; `code-reviewer` no unaddressed BLOCK; VS-12 marked
✅ Done. Issue folder deletion is left to you after on-device verify.
