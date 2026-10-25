# Reports Feature Context

## Domain Responsibility
Generating weekly and monthly reports with charts and month-over-month comparisons.

## No Own Tables
Reports are read-only aggregations across all other features. No dedicated database tables.

## Key Business Rules
- Weekly report: total spent this week, top categories, highest spending day, on-track indicator vs monthly budget.
- **Monthly report, three groups (UX-14).** The month stepper comes first and scopes
  *This month* (`ThisMonthSection`): in and out with a one-sentence conclusion
  (`reports.summary.topCategoriesShare`), the month against its plan, why the money went,
  categories as ranked bars, and the three biggest changes vs last month (*Show all*).
  *Over time* holds the typical month and the estimates; *Wealth* holds the Net worth
  card and the debt totals, labelled as of today because they are not month-specific.
  Both fold (`ReportGroup`): open by default from See / at Grow (`useIsBeforeStep`),
  open while the step is unknown, and the user's choice is remembered on the phone
  (`hooks/useRememberedToggle`, local `ui_preferences` table).
- Month-over-month: per-category bar chart comparing current vs previous month. Highlight increases > 10%.
- **No suggestions card (removed VS-56).** It only restated the comparison rows
  ("increased 18% — review it"). Advice now lives where it can be acted on: each
  category row opens `/budget/category/[id]?month=` (by path, no import), which shows
  the change against a usual month and a plan for next month.
- **Starting point (VS-58).** The first three *complete* months (80% of days logged,
  the running month never counts), found again on each read from the first logged day
  (`reports.startingPoint`, nothing stored). It is what the user really spent before
  any change, so it stays fixed while "Your typical month" (the last three months)
  moves. It lives **inside** the typical-month card: a progress line while it is being
  recorded ("1 of 3 months recorded", nothing else changes), a note while "now" is still
  the same months, then a Starting point · Now table with a % chip per row and every
  category behind one tap. With the table showing, the card drops its plain
  fixed/variable/unexpected rows so no figure appears twice. Each category in
  "Compare by category" lists its subcategories under it (VS-59, from
  `ProfileCategory.subcategories`); a category in both the fixed and variable lists
  is added up, not overwritten.
- **Why the month went (VS-62).** `report.why` (`reports.reasons.summariseReasons`) feeds
  the shared `components/WhyBreakdown`: routine · events · unexpected · everyday across
  every category, with the month's events listed and opening `/events/[id]` by path.
  Same rule as the Budget category detail. The month's imprévus (count, cost, share,
  last month) sit at its foot as `UnplannedSummary` (UX-14; it was a card of its own).
  That count covers every expense marked unexpected, including one tagged with an event
  that the bar counts under Events.
- Charts: bar charts for comparison; the category breakdown is a ranked bar per row (the
  donut went in UX-14: length reads better than angle). Colours come from the shared
  `categoryColors` palette, indexed by a category's position in the (amount-desc) breakdown.

## Cross-Feature Reads
This feature imports services from: `expenses`, `income`, `budget`, `funds`, `projects`, `debt`. All read-only — never writes to other features.

## Files
- `WeeklyReport.tsx`, `MonthlyReport.tsx`, `MonthComparison.tsx`, `SpendingBarChart.tsx`, `SpendingDonutChart.tsx`, `NavArrows.tsx`, `TypicalMonthCard.tsx`, `StartingPointCompare.tsx`, `categoryColors.ts`, `reports.profile.ts`, `reports.startingPoint.ts`, `reports.hooks.ts`, `reports.service.ts`, `reports.types.ts`
