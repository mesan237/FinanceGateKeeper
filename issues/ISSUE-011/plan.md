# ISSUE-011 — Phase 2 Implementation Plan (People Ledger / Debt Tracking)

Derived from `implementation-plan.md`. Closest analog: the **projects** slice (same shape: enum
constants → migration(s) → types → service → hooks → screens + detail-route → pure notif trigger →
thin routes + a root-mounted scheduler wrapper). Decision #1 (reminders evaluated on app open,
near-term one-shots) is **approved** — no open questions remain.

Blockers: VS-01 ✅ Done. No cross-feature edges (debt imports no other feature), so **no
ARCHITECTURE/CLAUDE cross-feature-table change**.

---

## Build order (TDD: each test written and red before its implementation)

### Subtask 1 — `daysBetween` date util
- **Test (red):** extend `src/utils/__tests__/formatDate.test.ts` — whole-day delta, UTC-stable
  across month/year boundary, signed (future = positive), accepts `Date | string`.
- **Impl:** add `daysBetween(a, b)` to `src/utils/formatDate.ts` using the existing `asDate` helper
  (`Math.round((asDate(b) − asDate(a)) / 86_400_000)`).

### Subtask 2 — Constants
- **Impl (no test; pure constants, mirrors `constants/projects.ts`):** `src/constants/debt.ts` —
  `DEBT_DIRECTION_VALUES`/`DebtDirection`/`DEBT_DIRECTION_SET`/`DEBT_DIRECTION_LABELS`,
  `DEBT_STATUS_VALUES`/`DebtStatus`/`DEBT_STATUS_SET`/`DEBT_STATUS_LABELS`, `DEBT_DUE_SOON_DAYS = 3`.

### Subtask 3 — Migration 014
- **Impl:** `src/services/migrations/014_create_debts_table.ts` (`id` autoincrement, `person_name`,
  `amount` INTEGER, `direction` CHECK(lent|owed), `date`, `due_date` nullable, `status`
  CHECK(pending|settled) DEFAULT pending, `note` nullable, `settled_at` nullable, `created_at`) +
  `idx_debts_direction_status`. Register in `src/services/migrations/index.ts` (import + array entry,
  id 14). Coverage comes via Subtask 4's in-memory `runMigrations`.

### Subtask 4 — Types + service (the core)
- **Test (red):** `src/features/finance/debt/__tests__/debt.service.test.ts` — in-memory better-sqlite3
  harness copied from `projects.service.test.ts`. Cases = the 5 TDD-anchor bullets:
  create→getById round-trip (incl. null due_date/note); `getDebts` per-direction + pending-first sort;
  `settleDebt` flips status/stamps `settled_at`/drops from totals/idempotent;
  `getOutstandingTotals` sums pending per direction, ignores settled;
  `getDueReminders` → `dueSoon` (≤3d), `overdue` (past), none for far-future / settled / no-due-date.
- **Impl:**
  - `src/features/finance/debt/debt.types.ts` — re-export enums; `Debt`, `NewDebt`, `DebtPatch`,
    `OutstandingTotals { lent; owed }`, `DebtReminder { debtId; personName; amount; dueDate;
    kind: 'dueSoon' | 'overdue' }`.
  - `src/features/finance/debt/debt.service.ts` — `mapDebt` + column const; `createDebt`,
    `getDebts(direction)`, `getDebtById`, `settleDebt`, `updateDebt`, `deleteDebt`,
    `getOutstandingTotals` (one `SUM ... GROUP BY direction` query), `getDueReminders(todayISO?)`
    (pending + non-null `due_date`, classified via `daysBetween`). DB-only; no React, no notifications
    import (keeps it under the 300-line cap and mirrors `projects.service`).

### Subtask 5 — Notification trigger (pure)
- **Test (red):** `src/notifications/triggers/__tests__/debtDueDate.test.ts` — `type: 'debtDueDate'`,
  non-empty title/body containing the person name; `dueSoon` vs `overdue` copy differs.
- **Impl:** `src/notifications/triggers/debtDueDate.ts` — local `DebtDueInput { personName; amount;
  dueDate; kind }` (duck-types `DebtReminder`; `notifications/` must not import `features/` — the
  `ProjectTimelineInput` pattern), `buildDebtDueAlert(input)` composing `MESSAGES.debtDueDate` +
  person/amount, branching copy on `kind`. No DB.

### Subtask 6 — Hooks
- **Test (red):** `src/features/finance/debt/__tests__/debt.hooks.test.ts` — service + notifications
  mocked. `useDebts(direction)` loads list + totals; `settle` re-fetches. `useDebtReminders()`
  schedules exactly one notification per reminder returned by `getDueReminders`.
- **Impl:** `src/features/finance/debt/debt.hooks.ts` —
  - `useDebts(direction)`: `{ debts, totals, loading, error, refresh, settle, remove }`.
  - `useDebtDetail(id)`: `{ debt, loading, error, refresh, settle, update, remove }`.
  - `useDebtReminders()`: on mount calls `getDueReminders()`, maps each → `buildDebtDueAlert` →
    `scheduleNotification`; returns `{ reminders, loading, error }` (the side effect *is* the point;
    the return value lets a future dashboard badge reuse it).

### Subtask 7 — Screens + detail route + scheduler wrapper
- **Tests (red):**
  - `__tests__/DebtListScreen.test.tsx` — two tabs; switching swaps the list; per-tab outstanding
    total; settled styling; "Add" → `/debt/create`; row → `/debt/[id]`; empty state per tab.
  - `__tests__/DebtForm.test.tsx` — requires person + positive amount + a direction; submit calls
    `createDebt` with entered values.
  - `__tests__/DebtDetail.test.tsx` — renders fields; **Mark settled** calls `settleDebt` and hides
    after; delete calls `deleteDebt`.
- **Impl (reusing only the 6 real primitives — Button, Typography, TextInput, Card, Modal,
  ProgressBar):**
  - `DebtListScreen.tsx` — local `useState<'lent'|'owed'>` segmented control (two `Button`s; no
    shared TabBar/Badge component exists yet); total header; rows = `Card` (person, amount,
    `formatDateShort(dueDate)`, status via `Typography variant="muted"`); "Add debt" `Button`.
  - `DebtForm.tsx` — mirrors `ProjectForm`: name/amount/optional due-date/optional note `TextInput`s
    + a Lent/Owed two-button direction selector; validates; `createDebt`; `router.replace('/debt')`.
  - `DebtDetail.tsx` — `useDebtDetail`; shows all fields; **Mark settled** (hidden once settled),
    delete; takes a `debtId: number` prop.
  - `DebtDetailRoute.tsx` — clone of `ProjectDetailRoute`: validate `?id`, render `<DebtDetail>`.
  - `DebtReminderScheduler.tsx` — root wrapper (mirrors `RecurringAutoLogger`/
    `DailyReminderScheduler`) that calls `useDebtReminders()` and renders `children`.

### Subtask 8 — Routes + wiring
- `src/app/debt/index.tsx`, `src/app/debt/create.tsx`, `src/app/debt/[id].tsx` — thin (render
  `DebtListScreen` / `DebtForm` / `DebtDetailRoute`).
- `src/app/_layout.tsx` — mount `<DebtReminderScheduler>` alongside the existing root wrappers.
- `src/features/finance/expenses/TransactionsScreen.tsx` — add a **Debts** button (→ `/debt`) to the
  secondary action row (debt is not a bottom-tab; reached like Settings/Quick-Add).

### Subtask 9 — Gate
- Run `/check-arch` inline: debt imports **no** feature; `notifications/` imports no feature; routes
  stay thin. Then `code-reviewer` on the branch diff (watch the 300-line cap on `debt.service.ts`).
- Mark VS-11 `✅ Done` in `docs/KANBAN.md` with test count + migration 014.

## Files (4 modified, 17 new)

**New:** `constants/debt.ts`; `migrations/014_create_debts_table.ts`; debt feature ×8
(`debt.types.ts`, `debt.service.ts`, `debt.hooks.ts`, `DebtListScreen.tsx`, `DebtForm.tsx`,
`DebtDetail.tsx`, `DebtDetailRoute.tsx`, `DebtReminderScheduler.tsx`); `triggers/debtDueDate.ts`;
3 route files; 4 new test files (`debt.service`, `debtDueDate`, `debt.hooks`, and the 3 screen tests
live in the debt `__tests__/` — counted as the screen-test set).
**Modified:** `utils/formatDate.ts` (+ test), `migrations/index.ts`, `app/_layout.tsx`,
`expenses/TransactionsScreen.tsx`.

## Design decisions made during planning (with rejected alternatives)

1. **`useDebtReminders` (hook) does the scheduling; a thin `DebtReminderScheduler` wrapper mounts it.**
   The repo has two precedents: a hook-less wrapper that calls a service module (`DailyReminderScheduler`
   → `auth/reminder.ts`), and root wrappers generally (`RecurringAutoLogger`). The implementation-plan
   (approved) names `useDebtReminders` as a hook, and KANBAN lists it under `debt.hooks.ts`, so I keep
   the orchestration in the hook and add only a 6-line wrapper as the mount host.
   *Rejected:* put scheduling in a `debt.reminders.ts` service module (à la `auth/reminder.ts`) and
   make the wrapper call it directly. Why rejected: would contradict the approved spec's explicit
   `useDebtReminders` hook and add a module without removing the hook KANBAN asks for.

2. **`getDueReminders` lives in `debt.service.ts` (DB read + classify); the notification side effect
   stays out of the service.** Keeps the service import-free of `notifications/` and unit-testable with
   in-memory SQLite (the heavy coverage). The hook composes `buildDebtDueAlert` + `scheduleNotification`.
   *Rejected:* `scheduleDueReminders()` inside the service. Why rejected: pushes an Expo-touching side
   effect into the DB layer and complicates the service test.

3. **Two-tab UI = local state + two `Button`s, not a navigator or shared TabBar/Badge.** Only
   `Button/Typography/TextInput/Card/Modal/ProgressBar` exist in `components/`; ARCHITECTURE lists
   `TabBar`/`Badge`/`EmptyState` but they're unbuilt. Two mutually-exclusive segments with no
   deep-linking need a segmented control, not a dependency I'd have to scaffold.
   *Rejected:* build shared `TabBar`/`Badge` now. Why rejected: out of this slice's scope; YAGNI until a
   second screen needs them.

4. **`DebtForm` redirects to `/debt` with `router.replace` after create** (mirrors `ProjectForm` →
   `/(tabs)/projects`). Debt has no tab, so the list route `/debt` is the natural landing.

5. **Composite index `(direction, status)`** backs both the list and the totals query — both filter on
   exactly that pair. *Rejected:* two single-column indexes (redundant for these queries).

## Done when
All 7 test files green and the full suite stays green; `/check-arch` clean; `code-reviewer` no
unaddressed BLOCK; VS-11 marked ✅ Done. Issue folder deletion is left to you after on-device verify.
