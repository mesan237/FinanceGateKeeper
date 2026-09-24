# Dashboard Feature Context

## Domain Responsibility
Aggregated overview of current financial state with quick action shortcuts. This is the home screen.

## No Own Tables
Dashboard is read-only aggregation. No dedicated database tables.

## Key Business Rules
- Shows: the month overview hero (month name, days left, what is left to spend, and the
  month's in/out/net), wallet balances, and today's total spending.
- `MonthOverviewCard` is one card by design: the budget remainder and the cashflow figures
  describe the same month, and splitting them made the page read as two unrelated summaries.
  Its cashflow row therefore sits above the quick-log block, not below it.
- No budget set (`expenseBudget === 0`) renders an em-dash and a "Set a monthly budget"
  prompt rather than `0 FCFA` under a green On Track chip — a confident pace reading about
  a budget that does not exist is worse than no reading. The bar, spent caption and pace
  chip are all suppressed in that state; the cashflow row stays, because logged income and
  expenses are facts that stand without a budget.
- Budget pace indicator: green (on track), yellow (75%+ spent with 10+ days remaining), red (over budget).
- Quick actions: "Expense", "Income", "I spent nothing today" — an inline "Quick log" section
  that scrolls with the page, sitting under the budget hero. Not a floating or fixed bar: pinned
  above the tab strip it crowded the system nav buttons.
- In learning mode: hide budget remaining, fund status, project status. Show only today's spending and quick log action.
- Dashboard refreshes on every focus (when tab is selected or app returns to foreground).

## Cross-Feature Reads
Imports services from: `expenses`, `budget`, `funds`, `projects`, `debt`. All read-only.

## Learning-Mode Gate
The dashboard never imports `auth`. `app/(tabs)/dashboard.tsx` reads `useAppMode()` and passes
`includeBudgetData={mode === 'control'}` as a prop — app-mode gating lives at the routing layer,
not in the feature (mirrors VS-08 precedent).

## Files
- `DashboardScreen.tsx`, `MonthOverviewCard.tsx`, `QuickActionBar.tsx`, `TodaySpendingCard.tsx`,
  `WalletsCard.tsx`, `SpendingSparkline.tsx`
- `dashboard.hooks.ts`, `dashboard.service.ts`, `dashboard.types.ts`

`MonthOverviewCard` replaced `BudgetSummaryCard` + `CashflowCard`. The 7-day sparkline it
used to duplicate lives only in `TodaySpendingCard` now.
