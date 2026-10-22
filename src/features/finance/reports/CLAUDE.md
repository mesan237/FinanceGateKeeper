# Reports Feature Context

## Domain Responsibility
Generating weekly and monthly reports with charts and month-over-month comparisons.

## No Own Tables
Reports are read-only aggregations across all other features. No dedicated database tables.

## Key Business Rules
- Weekly report: total spent this week, top categories, highest spending day, on-track indicator vs monthly budget.
- Monthly report sections: income vs expenses, allocation performance (planned vs actual per bucket), category breakdown (donut chart), fund progress, project progress, debt summary, month-over-month comparison.
- Month-over-month: per-category bar chart comparing current vs previous month. Highlight increases > 10%.
- **No suggestions card (removed VS-56).** It only restated the comparison rows
  ("increased 18% — review it"). Advice now lives where it can be acted on: each
  category row opens `/budget/category/[id]?month=` (by path, no import), which shows
  the change against a usual month and a plan for next month.
- Charts: bar charts for comparison, a donut chart for breakdown. Use consistent colors per category — the shared `categoryColors` palette indexes by a category's position in the (amount-desc) breakdown so a donut slice and its breakdown-row dot always match.

## Cross-Feature Reads
This feature imports services from: `expenses`, `income`, `budget`, `funds`, `projects`, `debt`. All read-only — never writes to other features.

## Files
- `WeeklyReport.tsx`, `MonthlyReport.tsx`, `MonthComparison.tsx`, `SpendingBarChart.tsx`, `SpendingDonutChart.tsx`, `NavArrows.tsx`, `categoryColors.ts`, `reports.hooks.ts`, `reports.service.ts`, `reports.types.ts`
