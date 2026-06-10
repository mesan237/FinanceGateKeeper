# ISSUE-011 — People Ledger (Debt Tracking)

**Maps to:** KANBAN VS-11
**Priority:** Medium
**Blocked by:** VS-01 Scaffold (✅ Done) only. This is a **standalone slice** — `debt` is not on
any cross-feature dependency edge (only `dashboard` and `reports`, both unbuilt, will later *read*
from it). No architecture amendments, no wiring into the allocation/expense flows.

---

## Problem Statement

The user lends and borrows money informally ("Lent 15,000 to Jean", "Owe 40,000 to Maman"). Today
nothing tracks it: lent money silently leaves the wallet with no record of who owes it back, and
owed money is forgotten until it's overdue. VS-11 adds a two-direction **people ledger**:

1. **Persisted debts in both directions.** Each entry records a person (free text), an amount, a
   direction (`lent` = they owe me / `owed` = I owe them), an optional due date, an optional note,
   and a `pending | settled` status.
2. **Two-tab view + totals.** A "Lent" tab and an "Owed" tab, each listing entries with person,
   amount, due date, and a status badge; the service exposes outstanding totals per direction.
3. **Settle flow.** Marking a debt settled flips its status, stamps `settled_at`, and moves it to a
   settled visual state.
4. **Due-date reminders.** A debt with a due date reminds 3 days before, then daily once overdue,
   stopping when settled (per the debt-feature `CLAUDE.md`).

One constraint shapes the design:

- **Debt is a pure ledger — it never touches money buckets.** Lent money is *not* income and owed
  money is *not* an expense (debt `CLAUDE.md`: lent money counts as income only when repaid and
  separately logged). So `debt.service` has zero imports from `budget`/`income`/`expenses`. The
  reports/dashboard integration is explicitly later slices.
- **Notifications never query the DB.** `debtDueDate.ts` is a pure payload builder; the *decision*
  to fire (which debts are due/overdue) is made by the feature, mirroring `zeroDayCheck` /
  `projectTimeline`.

## User Stories

- **As the lender,** I log "Lent 15,000 FCFA to Jean, due June 15" and see it in the **Lent** tab
  with the amount, due date, and a "pending" badge.
- **As the borrower,** I log "Owe 40,000 FCFA to Maman" (no due date) and see it in the **Owed** tab.
- **As the user,** each tab shows a running total of what's outstanding in that direction.
- **As the lender,** 3 days before June 15 I'm reminded; if Jean hasn't paid by the 15th the
  reminder repeats daily until I settle it.
- **As the user,** I tap a debt, hit **Mark settled**, and it drops out of the outstanding total and
  shows a settled style.

## Scope

Each bullet maps to a concrete file. Implementation order is top-to-bottom (tests precede
implementation per TDD).

### Constants

- `src/constants/debt.ts` — **new**, mirroring `constants/projects.ts`:
  - `DEBT_DIRECTION_VALUES = ['lent', 'owed'] as const`, `type DebtDirection`,
    `DEBT_DIRECTION_SET`, `DEBT_DIRECTION_LABELS` (`lent: 'Lent'`, `owed: 'Owed'`).
  - `DEBT_STATUS_VALUES = ['pending', 'settled'] as const`, `type DebtStatus`, `DEBT_STATUS_SET`,
    `DEBT_STATUS_LABELS`.
  - `DEBT_DUE_SOON_DAYS = 3` — how many days before the due date the "due soon" reminder fires.

### Database

- `src/services/migrations/014_create_debts_table.ts` — **new**: `debts` table —
  `id INTEGER PRIMARY KEY AUTOINCREMENT, person_name TEXT NOT NULL, amount INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('lent','owed')), date TEXT NOT NULL,
  due_date TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','settled')),
  note TEXT, settled_at TEXT, created_at TEXT NOT NULL`, plus
  `CREATE INDEX idx_debts_direction_status ON debts(direction, status)` (the list/totals queries
  filter on exactly this pair).
- `src/services/migrations/index.ts` — **modified**: register migration 14.

### Types — `src/features/finance/debt/debt.types.ts` (new)

- Re-export `DebtDirection`, `DebtStatus` from `@/constants/debt`.
- `Debt { id; personName; amount; direction: DebtDirection; date; dueDate: string | null;
  status: DebtStatus; note: string | null; settledAt: string | null; createdAt }`.
- `NewDebt = { personName; amount; direction: DebtDirection; dueDate?: string | null;
  note?: string | null; date?: string }` (date defaults to today in the service).
- `OutstandingTotals { lent: number; owed: number }`.
- `DebtReminder { debtId; personName; dueDate: string; kind: 'dueSoon' | 'overdue' }` — the feature
  computes these and feeds each into the trigger.

### Debt feature — `src/features/finance/debt/`

- `debt.service.ts` — **new**. Pure logic + DB calls, no JSX/React:
  - `createDebt(input: NewDebt): Promise<number>` — inserts `pending`; `date` defaults to
    `toISODate(today)`.
  - `getDebts(direction: DebtDirection): Promise<Debt[]>` — filtered by direction, ordered
    pending-first then by `due_date` (nulls last) then `created_at`.
  - `getDebtById(id): Promise<Debt | null>`.
  - `settleDebt(id, settledAtISO?): Promise<void>` — sets `status = 'settled'`,
    `settled_at = settledAtISO ?? now`. Idempotent (settling a settled debt is a no-op).
  - `updateDebt(id, patch): Promise<void>` — edit due date / note / amount / person.
  - `deleteDebt(id): Promise<void>`.
  - `getOutstandingTotals(): Promise<OutstandingTotals>` — sum of `amount` where `status='pending'`,
    grouped by direction (one query, `SUM(...) ... GROUP BY direction`).
  - `getDueReminders(todayISO?): Promise<DebtReminder[]>` — **pure-ish selector over the DB**:
    pending debts with a `due_date`, classified `dueSoon` (0 < daysUntil ≤ `DEBT_DUE_SOON_DAYS`) or
    `overdue` (daysUntil < 0). Settled debts and debts without a due date are excluded. Day math via
    a `utils/formatDate` helper (`daysBetween`, added below).
- `debt.hooks.ts` — **new**:
  - `useDebts(direction)` — list for a tab + outstanding totals + `settle`/`delete` mutations that
    re-fetch.
  - `useDebtDetail(id)` — single debt + `settle`/`update`/`delete`.
  - `useDebtReminders()` — calls `getDueReminders`, builds payloads via `buildDebtDueAlert`, and
    schedules them through `notifications.service` (the *feature* decides when, the trigger only
    formats). Mounted once (see Routes/Layout); mirrors `RecurringAutoLogger`/`DailyReminderScheduler`.
- `DebtListScreen.tsx` — **new**. Two-tab view (Lent / Owed) with a per-tab outstanding-total
  header; rows show person, amount, due date, status badge. "Add debt" → `/debt/create`; rows →
  `/debt/[id]`. Reuses `Card`, `Typography`, `Button`; tab state is local (no nav library tabs
  needed for two segments).
- `DebtDetail.tsx` — **new**. Full detail — person, amount, direction, due date, note, status;
  **Mark settled** button (hidden once settled), **Edit due date** entry, delete.
- `DebtForm.tsx` — **new**. Create/edit: person (required), amount (required, > 0), direction
  selector (Lent / Owed), optional due date, optional note. Reuses `TextInput`, `Button`.
- `DebtDetailRoute.tsx` — **new**, mirrors `ProjectDetailRoute`/`FundDetailRoute`: validates
  `useLocalSearchParams<{ id }>()`, renders `<DebtDetail debtId={…} />`.

### Notifications — `src/notifications/triggers/`

- `debtDueDate.ts` — **new**, pure: `buildDebtDueAlert(input: DebtDueInput): NotificationPayload`
  (`type: 'debtDueDate'`). Declares a local `DebtDueInput { personName; amount; dueDate; kind }`
  (structurally compatible with `DebtReminder`, because `notifications/` must not import
  `features/` — exactly the `ProjectTimelineInput` pattern). Composes copy from
  `MESSAGES.debtDueDate` plus the person/amount. No DB.
  (`NotificationType` already includes `debtDueDate`; `MESSAGES.debtDueDate` already exists — no
  config change needed.)

### Shared util

- `src/utils/formatDate.ts` — **modified**: add `daysBetween(a: Date | string, b: Date | string):
  number` (UTC-stable whole-day delta, consistent with `toISODate`/`addMonths`) for the
  due-soon/overdue classification. Pure; unit-tested.

### Routes / Layout

- `src/app/debt/index.tsx` — **new**, thin: renders `<DebtListScreen />`.
- `src/app/debt/create.tsx` — **new**, thin: renders `<DebtForm />`.
- `src/app/debt/[id].tsx` — **new**, thin: renders `<DebtDetailRoute />`.
- `src/features/finance/expenses/TransactionsScreen.tsx` — **modified**: add a **Debts** nav button
  to the secondary action row (debt is not a bottom-tab; it's reached the same way funds/settings
  are). `useDebtReminders` is mounted at the root layout (`src/app/_layout.tsx`) alongside the other
  schedulers, so reminders are evaluated on app open regardless of which screen is visited.

## TDD Anchors

Failing tests to write first; the slice is done when they all pass.

1. **`debt.service.test.ts`** — in-memory SQLite (mirrors `funds.service.test.ts`):
   - `createDebt` inserts a `pending` debt; `getDebtById` round-trips all fields incl. null due
     date/note.
   - `getDebts('lent')` returns only lent debts; `getDebts('owed')` only owed; pending sorts before
     settled.
   - `settleDebt` flips status to `settled`, stamps `settled_at`, and the debt leaves the
     outstanding total; settling twice is a no-op.
   - `getOutstandingTotals` sums pending amounts per direction and ignores settled debts.
   - `getDueReminders` returns `dueSoon` for a debt due in ≤ 3 days, `overdue` for a past due date,
     nothing for a debt due far out, nothing for a settled debt, nothing for a debt with no due date.
2. **`daysBetween` (formatDate test, extended)** — whole-day delta is correct and UTC-stable across
   a month/year boundary; sign reflects direction.
3. **`debtDueDate.test.ts`** — `buildDebtDueAlert` returns `type: 'debtDueDate'` with a non-empty
   title/body that includes the person name; differs for `dueSoon` vs `overdue`.
4. **`debt.hooks.test.ts`** — `useDebts` loads list + totals; `settle` mutation re-fetches (service
   mocked). `useDebtReminders` schedules one notification per reminder returned (service +
   notifications mocked).
5. **`DebtListScreen.test.tsx`** — renders both tabs; switching tabs swaps the list; settled debts
   render with the settled style; outstanding total shows; "Add" → `/debt/create`; row →
   `/debt/[id]`; empty state per tab.
6. **`DebtForm.test.tsx`** — requires person + positive amount + a direction; submit calls
   `createDebt` with the entered values.
7. **`DebtDetail.test.tsx`** — renders all fields; **Mark settled** calls `settleDebt` and hides
   afterward; delete calls `deleteDebt`.

## Acceptance Check (Done When)

- Logging "Lent 15,000 FCFA to Jean, due June 15" puts it in the **Lent** tab with a pending badge
  and adds to the lent outstanding total.
- A debt due within 3 days produces a `dueSoon` reminder; once past due it produces an `overdue`
  reminder; a settled debt produces none.
- Marking a debt settled moves it to the settled state and drops it from the outstanding total.
- The Lent and Owed tabs each show their own outstanding total and filter correctly.
- `npm test` — all new/extended test files pass; the full suite stays green.

## Design Decisions

- **(1) Reminders are evaluated on app open and scheduled as near-term one-shots, not pre-scheduled
  far in advance.** ✅ **Approved.** `useDebtReminders` (mounted at the root layout) runs
  `getDueReminders` on each app open and schedules a notification for each `dueSoon`/`overdue` debt
  via the existing `notifications.service`. This matches the daily-reminder/zero-day pattern already
  in the codebase and keeps the trigger DB-free, expresses "daily until settled" for free (each
  launch re-asks "still pending and overdue?"), and needs no cancel-on-settle/edit bookkeeping.
  *Rejected alt:* schedule a one-shot push at debt-creation time for "3 days before due" plus a daily
  repeat after. Why rejected: Expo one-shots can't express "daily until settled" cleanly,
  edits/settles would need to cancel-and-reschedule per debt (a `notification_id` column + cancel
  logic), and it diverges from how every other reminder in this app works. *Accepted trade-off:* if
  the user never opens the app, no debt reminder fires — acceptable for a single-user app already
  built around an end-of-day open-and-log habit (VS-08).

- **Debt is a self-contained ledger with no cross-feature edges.** `debt.service` imports nothing
  from `budget`/`income`/`expenses`; lent money becomes income only when separately logged (debt
  `CLAUDE.md`). So **no change to the approved cross-feature table** is needed. Reports/dashboard
  *reading* debt is VS-13/VS-14. *Rejected alt:* auto-create an income entry on settle of a lent
  debt — out of scope and couples two domains the PRD keeps separate.

- **A single composite index `(direction, status)`** backs both the per-tab list and the totals
  query, which always filter on that pair — cheaper and simpler than two single-column indexes.

- **`daysBetween` lives in shared `utils/formatDate.ts`**, not the feature — generic date math that
  reports and other slices will reuse, consistent with `addMonths`/`toISODate` from VS-10.

- **Two-tab UI is local component state, not a navigator.** Only two mutually-exclusive segments
  (Lent / Owed) with no deep-linking requirement, so a simple segmented control beats pulling in a
  tab navigator — same minimalist choice as the rest of the app's secondary screens.

## Out of Scope (Deferred)

- **Reports/Dashboard integration** — "money owed factored into expense obligations" and any debt
  summary card live in VS-13 (Dashboard) and VS-14 (Reports), which *read* from `debt.service`.
- **Auto-logging a repaid loan as income** on settle — kept separate per the PRD; the user logs that
  income manually.
- **Partial settlements / payment history** — a debt is pending or settled in full; instalment
  tracking is a follow-up.
- **Contact integration** — person names stay free text (debt `CLAUDE.md`).
- **Supabase mirroring** of `debts` → VS-15.

## After This Slice

1. Run `/check-arch` to confirm no dependency-rule violations (debt must import **no** other
   feature; `notifications/` must not import `features/` — the trigger uses a local `DebtDueInput`).
2. Invoke the `code-reviewer` subagent on the branch diff. Address any `BLOCK` findings (watch the
   300-line cap on `debt.service.ts`).
3. Mark VS-11 as `✅ Done` in `docs/KANBAN.md` with the test count and migration number (014).
4. Delete `issues/ISSUE-011/` after on-device verification.
