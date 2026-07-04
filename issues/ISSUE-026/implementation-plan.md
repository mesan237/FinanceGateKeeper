# ISSUE-026 — Unified Add-Transaction Entry Points

**Maps to:** KANBAN VS-26
**Priority:** High
**Blocked by:** VS-16 (Transaction UX / `AddTransactionSheet` ✅ Done)
**Audit refs:** H2 (+ M3 header cleanup) — `docs/ux-audit/phase-2-consistency.md`

---

## Problem Statement

The most-repeated action in the app — "add a transaction" — has **two different
UIs**:

1. The Dashboard `QuickActionBar` pushes **full-screen routes**
   `/expenses/log` and `/income/log`
   ([`QuickActionBar.tsx:56-64`](../../src/features/finance/dashboard/QuickActionBar.tsx#L56)).
2. The Transactions tab uses a **FAB → bottom sheet** (`AddTransactionSheet`)
   with an Expense / Income / Templates segmented control
   ([`TransactionsScreen.tsx:43-47`](../../src/features/finance/expenses/TransactionsScreen.tsx#L43)).

Both wrap the same `ExpenseEntryPanel` / `IncomeEntryPanel` bodies in two
different containers, navigations, and dismiss gestures. The user learns "add =
full screen with Cancel" on the dashboard, then "add = a sheet I swipe down" on
Transactions — an inconsistency that recurs every single day.

A related **M3** residue rides along: the custom `ScreenHeader` uses a text
**"Cancel"** on both true entry forms and navigational drill-downs (edit-detail
screens), muddying whether a tap discards a draft or just navigates back.

## User Stories

- **As any user**, tapping "Log Expense" or "Log Income" on the dashboard opens
  the **same bottom sheet** as the Transactions FAB, pre-selected to the matching
  segment — one mental model for adding a transaction everywhere.
- **As a user logging income from the dashboard**, saving still continues into the
  allocation flow, exactly as it does from the Transactions tab today.
- **As any user**, a screen's left header control tells the truth: **"Cancel"**
  means "discard this draft" (entry forms), **back chevron** means "go back"
  (drill-downs).

## Scope

### H2 — One sheet for both entry points

- **`src/features/finance/expenses/AddTransactionSheet.tsx`** — *modified*. Add an
  optional `initialSegment?: 'expense' | 'income' | 'templates'` prop (default
  `'expense'`). The reset-on-open effect
  ([`AddTransactionSheet.tsx:45-47`](../../src/features/finance/expenses/AddTransactionSheet.tsx#L45))
  seeds `setSegment(initialSegment ?? 'expense')` instead of the hard-coded
  `'expense'`. Income-save → `/income/allocate` behavior is **unchanged**
  (preserve the allocation continuation).
- **`src/features/finance/dashboard/DashboardScreen.tsx`** — *modified*. Mount an
  `AddTransactionSheet` instance and own its open/segment state locally
  (`useState`). Pass open callbacks down to `QuickActionBar`. On expense/template
  save, call the existing `refresh()` so the dashboard's aggregates update in
  place (mirrors `TransactionsScreen`'s `reloadToken` bump). Income save closes
  the sheet and routes to allocation via the sheet's own handler.
- **`src/features/finance/dashboard/QuickActionBar.tsx`** — *modified*. Replace the
  two `router.push('/expenses/log')` / `router.push('/income/log')` calls with
  two new callback props: `onLogExpense: () => void` and
  `onLogIncome: () => void`. The bar no longer needs `useRouter` for those two
  actions. (The "No spending" zero-day action is untouched.)
- **Cross-feature check:** `DashboardScreen` importing `AddTransactionSheet` is a
  `dashboard → expenses` edge, already approved in
  [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) (dashboard reads from expenses) and
  already exercised (the dashboard imports `useZeroDay` from `expenses.hooks`).
  The sheet transitively pulls `IncomeEntryPanel` via the pre-approved
  `expenses → income` edge — no **new** cross-feature edge is introduced. Confirm
  with `/check-arch` after wiring.

### H2 — Retire the standalone log routes for day-to-day use

- **Keep the route files** `src/app/expenses/log.tsx` and `src/app/income/log.tsx`
  (thin, zero-cost) so `ZeroDayPrompt` and any notification deep-link still resolve
  — but remove every **day-to-day** in-app push of them. After this slice the only
  remaining in-app pusher of `/expenses/log` is
  [`ZeroDayPrompt.tsx:44`](../../src/features/finance/expenses/ZeroDayPrompt.tsx#L44)
  ("Let me log" from the zero-day prompt — a notification-adjacent path, which is
  the explicit reason the routes are retained). `/income/log` has **no** remaining
  in-app pusher (reachable only by direct/deep link).
- `ExpenseLogScreen.tsx` / `IncomeLogScreen.tsx` keep `cancelLabel="Cancel"` — they
  remain genuine modal-style entry forms when reached from the prompt/deep link.

### M3 — One header rule (Cancel vs. back chevron)

Audit every `ScreenHeader` usage and apply the rule: **"Cancel"** only for
modal/entry forms that discard in-progress input; **back chevron** for
navigational drill-downs.

- **Keep `cancelLabel="Cancel"`** (true entry forms):
  `IncomeLogScreen.tsx`, `ExpenseLogScreen.tsx`, `ProjectForm.tsx`,
  `DebtForm.tsx`, `AccountForm.tsx` (create mode), `TransferLogScreen.tsx`.
- **Change to back chevron** (drill-downs reached by tapping a row — *detail/edit*,
  not a fresh entry):
  - **`src/features/finance/expenses/ExpenseDetailScreen.tsx:79`** — drop
    `cancelLabel="Cancel"` (title stays "Edit Expense").
  - **`src/features/finance/income/IncomeDetailScreen.tsx:100`** — drop
    `cancelLabel="Cancel"` (title stays "Edit Income").
- `AccountForm.tsx` is used for both create (entry → Cancel) and edit (drill-down).
  It already hard-codes `cancelLabel="Cancel"`. **Design Decision #2** below: leave
  as-is this slice (a mode-aware header there is out of proportion to the finding);
  document the exception.

## Scope Bullet → File Map

| KANBAN Scope bullet | Concrete change |
| --- | --- |
| Point Dashboard `QuickActionBar` "Log Expense"/"Log Income" at the same `AddTransactionSheet` (add `initialSegment` prop) instead of pushing routes | `AddTransactionSheet.tsx` (+`initialSegment`), `DashboardScreen.tsx` (mount sheet + state), `QuickActionBar.tsx` (route pushes → `onLogExpense`/`onLogIncome` callbacks) |
| Retire the standalone log routes for day-to-day use (keep for deep link/notification); income still continues to allocation on save | Remove dashboard pushes of `/expenses/log` + `/income/log`; keep `app/expenses/log.tsx` + `app/income/log.tsx` route files for `ZeroDayPrompt`/deep links; income-save→`/income/allocate` preserved in `AddTransactionSheet.tsx` |
| Verify the sheet opens from the dashboard without a cross-feature violation (dashboard → expenses approved) | No new edge; confirm via `/check-arch` against `docs/ARCHITECTURE.md` |
| M3 residue: audit `ScreenHeader` usages so "Cancel" is used only for modal/entry screens, back chevron for drill-downs | `ExpenseDetailScreen.tsx` + `IncomeDetailScreen.tsx` → back chevron; entry forms keep "Cancel"; `AccountForm` exception documented |

## TDD Anchors → Test Files

| KANBAN TDD Anchor | Test file | Assertion |
| --- | --- | --- |
| Dashboard "Log Income" opens the sheet on the Income segment; "Log Expense" on Expense | `src/features/finance/dashboard/__tests__/DashboardScreen.test.tsx` (*modified*) | Pressing "Log Expense" makes the sheet visible on the Expense segment; "Log Income" on the Income segment. Replaces the old `router.push('/expenses/log')` / `('/income/log')` assertions (lines 145-158). |
| (support) `initialSegment` seeds the sheet | `src/features/finance/expenses/__tests__/AddTransactionSheet.test.tsx` (*modified*) | `initialSegment="income"` opens on the Income segment; default (omitted) opens on Expense; sheet still resets to `initialSegment` each time `visible` flips true. |
| (support) bar invokes callbacks, not routes | `src/features/finance/dashboard/__tests__/QuickActionBar.test.tsx` (*modified*) | Pressing "Log Expense" calls `onLogExpense`; "Log Income" calls `onLogIncome`; neither calls `router.push`. Replaces the route-push assertions (lines 24-33). |
| No day-to-day path pushes the old full-screen log routes | `src/features/finance/dashboard/__tests__/DashboardScreen.test.tsx` (*modified*) | The dashboard never calls `router.push('/expenses/log')` or `('/income/log')`. (Regression guard for the retirement.) |
| Header left-control matches the modal-vs-drill-down rule on the audited screens | `src/features/finance/expenses/__tests__/ExpenseDetailScreen.test.tsx` (*modified*) + `src/features/finance/income/__tests__/IncomeDetailScreen.test.tsx` (*modified*) | Each detail/edit screen renders the back chevron (`screen-header-back` with accessibilityLabel "Back"), **not** the "Cancel" text label. |

## Acceptance Check (Done When)

1. **Both entry points use one sheet.** Tapping "Log Expense" or "Log Income" on the
   Dashboard opens the *same* `AddTransactionSheet` as the Transactions FAB,
   pre-selected to the matching segment. → asserted in `DashboardScreen.test.tsx`
   + `AddTransactionSheet.test.tsx`.
2. **No second full-screen form path for day-to-day logging.** The dashboard pushes
   neither `/expenses/log` nor `/income/log`; those routes survive only for the
   zero-day prompt / deep links. → regression assertion in
   `DashboardScreen.test.tsx`; manual check that the Transactions FAB is unchanged.
3. **Income still allocates.** Logging income from the dashboard sheet closes the
   sheet and continues to `/income/allocate`. → covered by the existing
   `AddTransactionSheet` income-save test (unchanged behavior).
4. **Headers follow one rule.** Drill-down edit screens show a back chevron; entry
   forms show "Cancel". → `ExpenseDetailScreen.test.tsx` +
   `IncomeDetailScreen.test.tsx`.
5. **Suite + `tsc` + `/check-arch` clean.** `npm test` green (net of the two known
   pre-existing failures — the date-driven `MonthlyReport` tests and the flaky auth
   CHECK test), `tsc` clean, `/check-arch` reports no new cross-feature edge.

## Design Decisions

- **(1) Standardize on the bottom sheet; the dashboard mounts its own
  `AddTransactionSheet` instance** rather than lifting the sheet to a shared
  location. Lowest-friction, keeps the approved `dashboard → expenses` edge, and
  avoids a shared-state provider for a two-caller feature. *Rejected alt:* hoist the
  sheet into a global provider — more surface than the finding warrants.
- **(2) `AccountForm` keeps `cancelLabel="Cancel"` in both create and edit modes**
  this slice. A mode-aware header (Cancel on create, chevron on edit) is
  disproportionate to an M-priority copy finding; the two clear-cut drill-down
  offenders (`ExpenseDetailScreen`, `IncomeDetailScreen`) are the ones corrected.
  **Confirm at the checkpoint** if you'd rather also split `AccountForm`.
- **(3) Route files are retained, not deleted.** `ZeroDayPrompt`'s "Let me log"
  deep-links to `/expenses/log`; keeping both thin routes costs nothing and honors
  the KANBAN "keep only if a deep link/notification needs them" clause.
  `QuickActionBar` losing `useRouter` for these two actions is the only removal.

## Out of Scope (Deferred)

- Rebuilding `ZeroDayPrompt` to open the sheet instead of pushing `/expenses/log`
  (it is the justification for keeping the route; converting it is a separate polish
  item).
- Any change to the Transactions-tab FAB or `TransactionsScreen` — it is already the
  canonical sheet host and stays as-is.
- Broader header/navigation redesign (native vs. custom header unification) — M3 here
  is copy discipline only.

## After This Slice

1. `/check-arch` — confirm no new cross-feature edge (dashboard still only reaches
   expenses through the approved edge).
2. `code-reviewer` subagent on the branch diff; address any `BLOCK` findings.
3. On-device verification: dashboard "Log Expense"/"Log Income" both open the sheet
   on the right segment; income still lands on the allocation screen.
4. Mark VS-26 `✅ Done` in `docs/KANBAN.md` with the test count.
5. Delete `issues/ISSUE-026/` after verification.
