# Reports Feature Context

## Domain Responsibility
Generating weekly and monthly reports with charts, month-over-month comparisons, and optimization suggestions.

## No Own Tables
Reports are read-only aggregations across all other features. No dedicated database tables.

## Key Business Rules
- Weekly report: total spent this week, top categories, highest spending day, on-track indicator vs monthly budget.
- Monthly report sections: income vs expenses, allocation performance (planned vs actual per bucket), category breakdown (pie chart), fund progress, project progress, debt summary, month-over-month comparison.
- Month-over-month: per-category bar chart comparing current vs previous month. Highlight increases > 10%.
- Optimization suggestions are rule-based, not AI:
  - Category increased > 10% → "Food spending increased 18% — review eating out"
  - Category consistently highest → "Transport is your #1 expense for 3 months running"
  - Under-budget category → "You saved 12,000 FCFA on Shopping — keep it up"
- Charts: bar charts for comparison, pie charts for breakdown. Use consistent colors per category.

## Cross-Feature Reads
This feature imports services from: `expenses`, `income`, `budget`, `funds`, `projects`, `debt`. All read-only — never writes to other features.

## Files
- `WeeklyReport.tsx`, `MonthlyReport.tsx`, `MonthComparison.tsx`, `SpendingBarChart.tsx`, `SpendingPieChart.tsx`, `OptimizationSuggestions.tsx`, `reports.hooks.ts`, `reports.service.ts`, `reports.types.ts`
