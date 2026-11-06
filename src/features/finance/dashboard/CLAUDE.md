# Dashboard Feature Context

## Domain Responsibility
Aggregated overview of current financial state with quick action shortcuts. This is the home screen.

## No Own Tables
Dashboard is read-only aggregation. No dedicated database tables.

## Key Business Rules
- Shows: the month overview hero (month name, days left, what is left to spend, and the
  month's in/out/net), wallet balances, and today's total spending.
- `MonthOverviewCard` answers one question with one figure (VS-94): money in/out and the
  month's imprévus sit behind *Details* in `MonthDetailsSheet`, not on the card.
- **Everyday spending vs the same day last month** (VS-95, `dashboard.lastMonth`): one line
  on the card with a `ChangeChip` (+/− %), both amounts in the details sheet. This month
  from the 1st to today against last month from the 1st to the same day (its last day when
  shorter). Only *variable* spending by `expenses.spendKindOf` counts: fixed categories,
  auto-logged bills and imprévus are left out so a bill paid on another day can't make it
  jump; refunds count against what they give back. Hidden before the 3rd and when last
  month had no everyday spending by then.
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
- The path card (`journey.JourneyCard`, VS-63) sits under the quick log: the current step,
  its goal and five segments; tapping opens the "My path" tab. It replaced the setup
  checklist card, which moved onto the path.
- Dashboard refreshes on every focus (when tab is selected or app returns to foreground).

## Cross-Feature Reads
Imports services from: `expenses`, `budget`, `funds`, `projects`, `debt`. All read-only.
Imports `JourneyCard` from `journey` (VS-63).

## Learning-Mode Gate
The dashboard never imports `auth`. `app/(tabs)/dashboard.tsx` reads `useAppMode()` and passes
`includeBudgetData={mode === 'control'}` as a prop — app-mode gating lives at the routing layer,
not in the feature (mirrors VS-08 precedent).

## Files
- `DashboardScreen.tsx`, `MonthOverviewCard.tsx`, `QuickActionBar.tsx`, `TodaySpendingCard.tsx`,
  `WalletsCard.tsx`, `SpendingSparkline.tsx`
- `MonthDetailsSheet.tsx` (VS-94)
- `dashboard.hooks.ts`, `dashboard.service.ts`, `dashboard.types.ts`
- `dashboard.lastMonth.ts`: `getEverydayVsLastMonth`, `compareEveryday` (VS-95)

`MonthOverviewCard` replaced `BudgetSummaryCard` + `CashflowCard`. The 7-day sparkline it
used to duplicate lives only in `TodaySpendingCard` now.
