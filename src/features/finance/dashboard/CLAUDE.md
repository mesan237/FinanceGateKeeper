# Dashboard Feature Context

## Domain Responsibility
Aggregated overview of current financial state with quick action shortcuts. This is the home screen.

## No Own Tables
Dashboard is read-only aggregation. No dedicated database tables.

## Key Business Rules
- Shows: remaining monthly expense budget, emergency fund progress, savings progress, top active project status, today's total spending.
- Budget pace indicator: green (on track), yellow (75%+ spent with 10+ days remaining), red (over budget).
- Quick actions: "Log Expense", "Log Income", "Confirm Zero Day" — visible as floating or fixed bar.
- In learning mode: hide budget remaining, fund status, project status. Show only today's spending and quick log action.
- Dashboard refreshes on every focus (when tab is selected or app returns to foreground).

## Cross-Feature Reads
Imports services from: `expenses`, `budget`, `funds`, `projects`, `debt`. All read-only.

## Learning-Mode Gate
The dashboard never imports `auth`. `app/(tabs)/dashboard.tsx` reads `useAppMode()` and passes
`includeBudgetData={mode === 'control'}` as a prop — app-mode gating lives at the routing layer,
not in the feature (mirrors VS-08 precedent).

## Files
- `DashboardScreen.tsx`, `BudgetSummaryCard.tsx`, `FundStatusCard.tsx`, `QuickActionBar.tsx`
- `dashboard.hooks.ts`, `dashboard.service.ts`, `dashboard.types.ts`
