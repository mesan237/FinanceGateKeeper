# Net Worth Feature Context

## Domain Responsibility
Progress over time (VS-53): one figure for what the user has, and how much of each
month's income they kept. Shown as a card on the Reports tab and a month-end history.

## User decisions (2026-10-21)
- **Money only, assets later.** Net worth = active wallets + still lent out (debts
  `lent`, total to repay — else amount — less repayments, VS-54) − still owed (debts
  `owed`, same rule) + tontine position
  (contributions − payouts). No hand-entered land, livestock or business values yet.
- **Month-end snapshots.** Each closed month is stored once (`month_snapshots`), so an
  edit to an old entry does not rewrite history. "Recalculate" refreshes a month on
  purpose. The current month is always live, never stored.
- **Savings rate = income kept:** `(income − spending) ÷ income`, whole percent;
  negative when the month spent more than came in; none without income.

## Rules
- Every figure is **as of a day**: wallets via `accounts.getAccountBalance(id, asOf)`
  (balance checks dated by then honoured, later movements ignored); debts and tontine
  payments by SQL with `date <= asOf`. Hidden wallets are left out, as from cash on hand.
- `month_snapshots` is **append-only**; the latest row per month wins (`created_at`,
  then `id`). No UNIQUE on `month`: two devices closing the same month, or a
  recalculation, just add rows — a UNIQUE would fail the second device's sync.
- `closeMonths` (root `MonthCloser`, on open and foreground) fills every closed month
  without a snapshot, from the first logged entry, at most `SNAPSHOT_LOOKBACK` (24)
  months back. It **stops at the first month a recurring bill is still to be logged
  into** (an active bill's `next_due_date` on or before the month's last day): React
  runs `MonthCloser`'s effect before `RecurringAutoLogger`'s, so a month could otherwise
  be frozen without a bill the auto-logger is about to add. It closes on a later run.

## Database Tables (migration 046, Supabase patch 050; synced)
- `month_snapshots` — id, month (YYYY-MM), wallets, lent, owed, tontines, net_worth,
  income, spending, created_at.

## Dependencies
- `networth` → `accounts`: `getAccountBalance` as of a day.
- `reports` → `networth`: the `NetWorthCard` at the top of the Reports tab.
- Debts, tontines, income, expenses and recurring bills are read by SQL, so no other
  edge is needed.

## Module Map
| File | Job |
| --- | --- |
| `networth.types.ts` | NetWorth, MonthFlows, MonthSnapshot |
| `networth.compute.ts` | `getNetWorthAsOf`, `getMonthFlows`, pure `savingsRate` |
| `networth.snapshots.ts` | `closeMonths`, `recalculateMonth`, `getSnapshots` |
| `networth.format.ts` | Signed amounts, the parts line, savings sentences |
| `networth.hooks.ts` | `useNetWorth`, `useNetWorthHistory`, `useMonthCloser` |
| `NetWorthCard.tsx` | Reports card: today, change, savings rate, link to history |
| `NetWorthHistoryScreen.tsx` | `/reports/net-worth`: closed months, recalculate |
| `MonthCloser.tsx` | Root wrapper that snapshots closed months |
