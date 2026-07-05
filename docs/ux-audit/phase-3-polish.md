# Phase 3 — Polish

**Goal:** even out the rough edges — empty/loading states, native pickers, and
menu hygiene — so the app feels finished on every screen, not just the polished
ones.

Ordered high → low: **M1 → M2 → M4 → M5 → M6**.

---

## M1 — Reports has no empty/error-only state (blank screen) · Priority: MEDIUM · Essential-ish

**Current behavior**
[`MonthlyReport.tsx:66-196`](../../src/features/finance/reports/MonthlyReport.tsx#L66)
renders the body only when `report` is truthy. If `report` is null and not
loading, the tab shows just the month arrows and nothing else.

**Why it's a problem**
A brand-new user opening Reports sees a near-blank screen with no guidance about
why it's empty or what to do.

**Proposed change**
Add an empty state matching the quality of the Projects empty state
([`ProjectListScreen.tsx:42-63`](../../src/features/finance/projects/ProjectListScreen.tsx#L42)):
icon + title + subtitle, e.g. "No data yet — log a few transactions to see your
monthly report."

**Acceptance**
- Empty Reports tab shows a friendly explanatory state, not a blank scroll view.

---

## M2 — Inconsistent empty/loading states across screens · Priority: MEDIUM · Recommended

**Current behavior**
- Projects: full aspirational empty state with icon + CTA
  ([`ProjectListScreen.tsx:42-63`](../../src/features/finance/projects/ProjectListScreen.tsx#L42)).
- Budget: plain muted text "Log income to start tracking your budget."
  ([`BudgetOverview.tsx:53`](../../src/features/finance/budget/BudgetOverview.tsx#L53)).
- Transactions: plain "No transactions in {month}."
- Dashboard: large `ActivityIndicator` + "Loading…"
  ([`DashboardScreen.tsx:50-58`](../../src/features/finance/dashboard/DashboardScreen.tsx#L50)).
- Budget / Reports: bare "Loading…" text, no spinner.

**Why it's a problem**
The app feels uneven — some screens polished, others skeletal. Loading even uses
two different patterns (spinner vs text).

**Proposed change**
- Create one shared `EmptyState` component (icon + title + subtitle + optional
  CTA) under `components/` and use it on Budget, Transactions, Reports, and
  anywhere else with an empty case.
- Standardize loading on a single spinner pattern (reuse the dashboard's
  `ActivityIndicator` treatment) via a small `LoadingState` component.

**Implementation notes**
- Both go in root `components/` (shared infra) so every feature can import them.
- Migrate screens incrementally; the Projects empty state can become the first
  consumer / visual reference.

**Acceptance**
- Empty and loading states look and behave the same across all tabs.

---

## M4 — Reminder time is a raw `HH:mm` text field · Priority: MEDIUM · Recommended

**Current behavior**
[`SettingsScreen.tsx:146-152`](../../src/features/finance/auth/SettingsScreen.tsx#L146)
uses a free-text `TextInput` (placeholder "HH:mm (e.g. 21:00)") validated on save
— yet `@react-native-community/datetimepicker` is already a dependency
([`package.json:18`](../../package.json#L18)) and a `DateField` component exists
([`ExpenseEntryPanel.tsx:94`](../../src/features/finance/expenses/ExpenseEntryPanel.tsx#L94)).

**Why it's a problem**
Typing a time is error-prone and un-mobile; users can enter garbage and get an
error instead of being guided to a valid value.

**Proposed change**
Replace the text field with a native time picker (a `TimeField` sibling to
`DateField`, or the platform picker directly). Persist the same `HH:mm` string so
the reminder scheduler is unchanged.

**Implementation notes**
- Reuse `applyReminderSchedule` as-is; only the input control changes.
- The picker eliminates the need for the on-save validation error path.

**Acceptance**
- Reminder time is chosen from a native picker; no free-text entry, no format
  error state.

---

## M5 — Drawer half-full of disabled "Soon" dead links · Priority: MEDIUM · Recommended

**Current behavior**
[`AppDrawerContent.tsx:35-58`](../../src/components/AppDrawerContent.tsx#L35)
lists Export, **Backup & Restore**, Delete & Reset, and Help as disabled "Soon"
rows. Backup & Restore being disabled contradicts the app's advertised cloud sync
([`_layout.tsx:44`](../../src/app/_layout.tsx#L44) `useBackgroundSync`).

**Why it's a problem**
A menu that's ~40% inert reads as unfinished and disappoints on every tap
(nothing happens). Advertising a disabled "Backup & Restore" next to working
cloud sync is actively confusing.

**Proposed change**
Hide unbuilt rows until they ship (or collapse them into a single, non-tappable
"More coming soon" note). Don't surface capabilities that no-op.

**Acceptance**
- The drawer shows only actionable rows; no dead "Soon" placeholders.

---

## M6 — Accounts/Categories buried; deleted-projects trash icon is cryptic · Priority: MEDIUM · Recommended

**Current behavior**
- Accounts and Categories — needed by the expense/income flows (both have
  AccountPickers) — live only in the drawer
  ([`AppDrawerContent.tsx:40-41`](../../src/components/AppDrawerContent.tsx#L40)).
- "Recently deleted projects" is a **trash icon in the Projects tab header's
  top-right** ([`(tabs)/_layout.tsx:40-54`](../../src/app/(drawer)/(tabs)/_layout.tsx#L40)),
  which reads as "delete this," not "view deleted."

**Why it's a problem**
Discoverability of Accounts/Categories is low; the trash icon is a
destructive-looking control that is actually navigational.

**Proposed change**
- Add an entry point to Accounts from the Dashboard **Wallets** card
  ([`WalletsCard`](../../src/features/finance/dashboard/WalletsCard.tsx)).
- Replace the Projects-header trash icon with an overflow (⋯) menu whose item
  reads "Recently deleted."

**Acceptance**
- Accounts reachable in one tap from the dashboard.
- The deleted-projects entry no longer looks like a destructive action.
