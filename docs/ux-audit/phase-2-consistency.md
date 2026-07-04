# Phase 2 — Consistency

**Goal:** one pattern per task, and app-mode applied everywhere. Removes the
"two mental models for the same thing" tax that compounds daily.
**Depends on:** Phase 1 (users now understand modes, so gating them consistently
is meaningful).

Ordered high → low: **H2 → H5 → M3**.

---

## H2 — Two inconsistent patterns for the "Add transaction" task · Priority: HIGH · Essential

**Current behavior**
- Dashboard `QuickActionBar` pushes **full-screen routes** `/expenses/log`,
  `/income/log` ([`QuickActionBar.tsx:56-64`](../../src/features/finance/dashboard/QuickActionBar.tsx#L56)).
- Transactions tab uses a **FAB → bottom sheet** with an Expense/Income/Templates
  segmented control
  ([`TransactionsScreen.tsx:30-47`](../../src/features/finance/expenses/TransactionsScreen.tsx#L30),
  [`AddTransactionSheet.tsx`](../../src/features/finance/expenses/AddTransactionSheet.tsx)).

Both reuse the same `ExpenseEntryPanel` / `IncomeEntryPanel` bodies but wrap them
in two different containers, navigations, and dismiss gestures.

**Why it's a problem**
The most-repeated action in the app has two UIs. The user learns "add = full
screen with Cancel" on the dashboard, then "add = a sheet I swipe down" on
Transactions. The inconsistency recurs every single day.

**Proposed change**
Standardize on the **bottom sheet** (lower friction, keeps context, already the
richer surface with Templates + transfer link). Point both entry points at it:
- Dashboard "Log Expense" / "Log Income" open `AddTransactionSheet` pre-selected
  to the matching segment instead of pushing routes.
- Keep the standalone `/expenses/log` and `/income/log` routes only if needed for
  deep links/notifications; otherwise retire them to avoid drift.

**Implementation notes**
- `AddTransactionSheet` already accepts `visible` + `onClose` and resets to the
  Expense segment on open ([`AddTransactionSheet.tsx:45`](../../src/features/finance/expenses/AddTransactionSheet.tsx#L45)).
  Add an optional `initialSegment` prop so the dashboard can request `income`.
- The sheet lives in the expenses feature and the dashboard already reads from
  expenses per the approved cross-feature list — hoist the sheet state so the
  dashboard action bar can open it (or lift the sheet to a shared location the
  dashboard can mount). Confirm against
  [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) cross-feature table before wiring.
- Income still continues to the allocation flow on save — preserve that.

**Acceptance**
- "Log Expense"/"Log Income" from the dashboard open the same sheet as the
  Transactions FAB, on the correct segment.
- No second full-screen form path remains for day-to-day logging.

---

## H5 — Reports tab contradicts Learning mode · Priority: HIGH · Essential

**Current behavior**
The Budget tab is hidden in Learning mode, but the Reports tab is always visible
and unconditionally renders Expense Performance, planned/allocation figures,
Funds, and Projects sections
([`MonthlyReport.tsx:84-179`](../../src/features/finance/reports/MonthlyReport.tsx#L84)).
In Learning mode these are all zero/empty.

**Why it's a problem**
The app claims budgeting is "hidden" in Learning mode, yet Reports exposes the
same budgeting concepts as empty sections — mixed signals, and a wall of zeros
that reads as "broken."

**Proposed change**
Apply the mode gate to Reports the same way the Dashboard does: in Learning mode
show only income / expense / category analytics; hide Expense Performance, Funds,
Projects, and allocation comparison.

**Implementation notes**
- Mirror the dashboard precedent: the routing layer
  ([`(tabs)/reports.tsx`](../../src/app/(drawer)/(tabs)/reports.tsx)) reads
  `useAppMode()` and passes `includeBudgetData` into `MonthlyReport`, keeping the
  reports feature free of the auth import.
- Guard the budgeting sections in `MonthlyReport` behind that prop.

**Acceptance**
- Learning-mode Reports shows income/expense/category content only.
- Control-mode Reports is unchanged.

---

## M3 — Two header systems + mixed back/cancel metaphors · Priority: MEDIUM · Recommended

**Current behavior**
- Tab screens use the native React-Navigation header (centered title, hamburger
  left — [`(tabs)/_layout.tsx:64-96`](../../src/app/(drawer)/(tabs)/_layout.tsx#L64)).
- Pushed screens use the custom
  [`ScreenHeader`](../../src/components/ScreenHeader.tsx).
- Within pushed screens the left affordance is inconsistent: Income log shows a
  text **"Cancel"** ([`IncomeLogScreen.tsx:21`](../../src/features/finance/income/IncomeLogScreen.tsx#L21)),
  while Allocation and Budget Settings show a **back chevron**
  ([`AllocationScreen.tsx:129`](../../src/features/finance/budget/AllocationScreen.tsx#L129)).

**Why it's a problem**
"Cancel" implies a discardable modal; "Back" implies navigation. Using both for
structurally similar screens muddies expectations about what a tap will do.

**Proposed change**
Adopt one rule and apply it everywhere:
- **"Cancel"** (text) only for true modal/entry forms that discard in-progress
  input (e.g. logging income/expense as a standalone screen, if any survive
  Phase 2's H2 consolidation).
- **Back chevron** for navigational drill-downs (detail screens, settings).

**Implementation notes**
- `ScreenHeader` already supports both via the `cancelLabel` prop — this is a copy
  discipline change, not new components. Audit each `ScreenHeader` usage and set
  `cancelLabel` only where the screen is modal-like.
- Note: if H2 retires the standalone income/expense log routes, several "Cancel"
  usages disappear naturally.

**Acceptance**
- Every pushed screen's left control matches the rule; no modal uses a chevron and
  no drill-down uses "Cancel".
