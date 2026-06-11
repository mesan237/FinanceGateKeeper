# ISSUE-014 — Weekly & Monthly Reports with Charts

**Maps to:** KANBAN VS-14
**Priority:** Medium
**Blocked by:** VS-03, VS-05, VS-06, VS-09, VS-10, VS-11 (all ✅ Done)

---

## Scope Decisions (settled before drafting)

**1. Chart library: react-native-chart-kit (not Victory Native)**
`react-native-chart-kit` has a simpler API, is better-suited to Expo managed workflow, and is sufficient
for bar + pie charts. Both libraries need `react-native-svg`, but Victory Native carries significantly
more configuration overhead. In Jest, chart components are mocked at the module level — SVG never runs
in tests.

**2. No new migration.**
Reports is a pure read-only aggregation layer. All source data lives in existing tables. No schema
change is required.

**3. `reports.service.ts` calls other feature service functions — never raw DB queries.**
All the functions needed exist and are already exported:
- `expenses.service`: `getExpensesByDateRange`, `getAllCategories`
- `income.service`: `getIncomeByDateRange`
- `budget.service`: `getMonthlyBudget`
- `funds.service`: `getOrCreateFunds`, `getFundProgress`
- `projects.service`: `getProjects`
- `debt.service`: `getOutstandingTotals`

**4. Reports tab renders `MonthlyReport` directly — no separate landing screen.**
`app/(tabs)/reports.tsx` currently renders an empty `<View>`. It will be replaced with
`<MonthlyReportRoute />`. The tab IS the monthly report. A "Weekly" button inside the monthly report
navigates to `app/reports/weekly.tsx`.

**5. Week boundaries are Monday–Sunday (ISO week convention).**
`getWeeklyReport(weekStartISO)` expects the Monday of the desired week. `useWeeklyReport` defaults to
the current week's Monday. Prev/next navigation in `WeeklyReport.tsx` shifts by 7 days.

**6. `MonthComparison.tsx` is a component, not a standalone screen.**
It is embedded at the bottom of `MonthlyReport.tsx`. It takes `CategoryDelta[]` and renders a grouped
comparison via `SpendingBarChart`. No separate route.

**7. Allocation performance is expense-bucket only.**
`MonthlyBudget` exposes `breakdown.expenses` (planned) and `expensesLogged` (actual). Actual deposits
to emergency/savings/projects per month would require per-month fund-transaction queries that don't
exist yet. The report shows the full allocation breakdown (planned amounts per bucket) and expense
performance (planned vs actual + remaining). Fund/project/debt sections are progress-only views.

**8. `generateSuggestions` implements only the "increase > 10%" rule.**
The "consistent #1 for 3 months" and "under-budget category" rules require either 3-month history
loading or per-category budget tracking — both out of scope for VS-14. One rule, fully tested.

**9. Types are self-contained in `reports.types.ts` — no cross-feature type imports.**
Rather than importing `AllocationBreakdown` from `budget.types`, a structurally identical
`AllocatedBreakdown` is declared locally. Four-number shapes do not merit a cross-file dependency.

---

## Problem Statement

The Reports tab currently renders an empty View. Users have no way to see how they spent this week or
month, how their budget allocations performed, or whether spending trends are improving. VS-14 builds
the full read-only analytics layer: weekly pulse, monthly deep dive, month-over-month comparison, and
rule-based optimization suggestions.

---

## User Stories

- **As the user,** I can see how much I spent this week and which categories drove the most spending.
- **As the user,** I can see a daily spending bar chart for the current week.
- **As the user,** I can see a monthly report showing total income, total expenses, allocation
  performance, a category pie chart, fund and project progress, and a debt summary.
- **As the user,** I can see how this month's category spending compares to last month.
- **As the user,** I see an optimization suggestion when a category's spending increased > 10% vs last
  month.
- **As the user,** I can navigate to the weekly report from the monthly report and use prev/next arrows
  to browse weeks.

---

## Scope

Files are listed in TDD order — tests before implementation, data layer before UI.

---

### 1. `src/features/finance/reports/reports.types.ts` (new)

```ts
/** A single category's contribution to a spending total. */
export interface CategorySpend {
  categoryId: number;
  categoryLabel: string;
  amount: number;
  /** 0–100 percentage of the period's total spend. */
  pct: number;
}

export interface DaySpend {
  date: string;   // YYYY-MM-DD
  amount: number;
}

export interface WeeklyReport {
  weekStart: string;             // YYYY-MM-DD (Monday)
  weekEnd: string;               // YYYY-MM-DD (Sunday)
  totalSpent: number;
  totalIncome: number;
  topCategories: CategorySpend[]; // top 3 by amount, or fewer if < 3 categories
  spendingByDay: DaySpend[];      // 7 entries Mon→Sun, 0 for days with no spend
  peakDay: DaySpend | null;       // highest-spend day; null if totalSpent === 0
}

/** Planned amounts per allocation bucket for the month. */
export interface AllocatedBreakdown {
  emergencyFund: number;
  savings: number;
  projects: number;
  expenses: number;
}

export interface ExpensePerformance {
  planned: number;    // breakdown.expenses (allocated for expenses this month)
  actual: number;     // total expenses logged
  remaining: number;  // planned − actual (may be negative)
}

export interface FundSummary {
  type: string;          // 'emergency' | 'savings'
  current: number;
  target: number | null;
  pct: number | null;    // null when no target
}

export interface ProjectSummary {
  id: number;
  name: string;
  funded: number;
  target: number;
  pct: number;   // 0–100
}

export interface DebtSummaryData {
  totalLent: number;
  totalOwed: number;
}

export interface CategoryDelta {
  categoryId: number;
  categoryLabel: string;
  current: number;
  previous: number;
  /** null when previous === 0 (undefined growth rate). */
  pctChange: number | null;
}

export interface MonthComparison {
  month: string;          // YYYY-MM (current)
  previousMonth: string;  // YYYY-MM
  categories: CategoryDelta[];
}

export interface OptimizationSuggestion {
  type: 'increase';
  categoryLabel: string;
  pctChange: number;
  message: string;
}

export interface MonthlyReport {
  month: string;
  incomeTotal: number;
  expensePerformance: ExpensePerformance;
  allocatedBreakdown: AllocatedBreakdown;
  categoryBreakdown: CategorySpend[];
  fundProgress: FundSummary[];
  projectProgress: ProjectSummary[];
  debtSummary: DebtSummaryData;
  /** null when there is no income/expense data for the previous month. */
  comparison: MonthComparison | null;
  suggestions: OptimizationSuggestion[];
}
```

---

### 2. Service tests — `src/features/finance/reports/__tests__/reports.service.test.ts` (new, failing first)

Mock all upstream service modules. Each test controls what the mocks return. TDD anchors:

1. `getWeeklyReport` — `totalSpent` equals the sum of all expense amounts in the mocked range.
2. `getWeeklyReport` — `topCategories` is sorted descending by amount; pct values sum to 100.
3. `getWeeklyReport` — `peakDay` is the date with the highest single-day total; `null` when no expenses.
4. `getWeeklyReport` — `spendingByDay` has exactly 7 entries covering `weekStart`..`weekEnd`; days with
   no expenses have `amount: 0`.
5. `getMonthlyReport` — `expensePerformance.actual` matches the sum of mocked expenses.
6. `getMonthlyReport` — `categoryBreakdown` pct values sum to 100 (within floating-point tolerance).
7. `getMonthComparison` — `pctChange` is `null` when previous amount is 0.
8. `getMonthComparison` — `pctChange` is correct for a known before/after pair.
9. `generateSuggestions` — returns a suggestion for a category with `pctChange > 10`.
10. `generateSuggestions` — returns no suggestion when `pctChange <= 10`.
11. `generateSuggestions` — returns no suggestion when `pctChange` is `null` (previous was 0).

---

### 3. `src/features/finance/reports/reports.service.ts` (new)

```ts
import { getExpensesByDateRange, getAllCategories } from '@/features/finance/expenses/expenses.service';
import { getIncomeByDateRange } from '@/features/finance/income/income.service';
import { getMonthlyBudget } from '@/features/finance/budget/budget.service';
import { getOrCreateFunds, getFundProgress } from '@/features/finance/funds/funds.service';
import { getProjects } from '@/features/finance/projects/projects.service';
import { getOutstandingTotals } from '@/features/finance/debt/debt.service';
import { toISODate } from '@/utils/formatDate';
import type { ... } from './reports.types';
```

**`getWeeklyReport(weekStartISO)`:**
- `weekEnd` = weekStart + 6 days (pure date arithmetic, no library)
- Fetch `getExpensesByDateRange(weekStart, weekEnd)` and `getIncomeByDateRange(weekStart, weekEnd)`
- Fetch `getAllCategories()` for label resolution (build a `Map<id, name>`)
- Group expenses by `date` → `spendingByDay` (7 slots, 0-filled for empty days)
- Group expenses by `categoryId` → `topCategories` (sort desc, take ≤ 3, compute pct)
- `peakDay` = max of `spendingByDay` where amount > 0; null if all zeros

**`getMonthlyReport(monthISO)`:**
- `monthlyBudget = getMonthlyBudget(monthISO)` — income total, allocation, breakdown, expensesLogged/Remaining
- `firstDay = monthISO + '-01'`, `lastDay` computed via `new Date(year, month, 0)` day count
- `getExpensesByDateRange(firstDay, lastDay)` + `getAllCategories()` → `categoryBreakdown`
- `getOrCreateFunds()` + `getFundProgress()` → `fundProgress`
- `getProjects()` filter `status !== 'completed'` → `projectProgress`
- `getOutstandingTotals()` → `debtSummary`
- `prevMonth = prevMonthISO(monthISO)` → `getMonthComparison(monthISO, prevMonth)` (wrapped in
  try/catch — return null if no data for previous month)
- `suggestions = generateSuggestions(comparison ?? { categories: [] })`

**`getMonthComparison(monthISO, previousMonthISO)`:**
- Fetch expenses + categories for both months
- Group each month's expenses by categoryId
- Merge both sets of categoryIds
- For each: `pctChange = previous > 0 ? (current - previous) / previous * 100 : null`
- Only include categories that had spending in at least one of the two months

**`generateSuggestions(comparison)`:**
- For each `delta` where `pctChange !== null && pctChange > 10`:
  - `message = "${categoryLabel} spending increased ${Math.round(pctChange)}% vs last month — review it."`
- Returns `OptimizationSuggestion[]` (may be empty)

**Private helpers (not exported):**
```ts
/** Returns the YYYY-MM string for the month before `monthISO`. */
function prevMonthISO(monthISO: string): string

/** Returns the last day of the given YYYY-MM month as a YYYY-MM-DD string. */
function lastDayOfMonth(monthISO: string): string

/** Advances a YYYY-MM-DD date by `days` days. */
function addDays(isoDate: string, days: number): string
```

---

### 4. Chart component tests (new, failing first)

**`src/features/finance/reports/__tests__/SpendingBarChart.test.tsx`:**
- Mock `react-native-chart-kit` at module level (`jest.mock('react-native-chart-kit', () => ({ BarChart: 'BarChart' }))`)
- 1. Renders without crashing when given non-empty data.
- 2. Renders without crashing when `data` is empty (labels: [], values: []).

**`src/features/finance/reports/__tests__/SpendingPieChart.test.tsx`:**
- Mock `react-native-chart-kit` (`PieChart: 'PieChart'`)
- 1. Renders without crashing when given non-empty `CategorySpend[]`.
- 2. Renders an empty-state message when `data` is empty.

---

### 5. `src/features/finance/reports/SpendingBarChart.tsx` (new)

```tsx
export interface SpendingBarChartProps {
  labels: string[];
  values: number[];
  /** Width in dp; defaults to Dimensions.get('window').width - 32. */
  width?: number;
}
```

Thin wrapper around `react-native-chart-kit`'s `BarChart`. Renders nothing (returns `null`) when
`values` is empty or all zeros, so callers don't need to guard. Uses `PRIMARY_GREEN` as the bar color.

---

### 6. `src/features/finance/reports/SpendingPieChart.tsx` (new)

```tsx
export interface SpendingPieChartProps {
  data: CategorySpend[];
  width?: number;
}
```

Thin wrapper around `react-native-chart-kit`'s `PieChart`. Maps `CategorySpend[]` to the chart
library's `{ name, population, color, legendFontColor }` format. Renders a muted "No data" Typography
when `data` is empty. Uses a fixed palette of 8 colors cycling via index.

Color palette (8 entries, matches default category order): `['#4CAF50','#2196F3','#FF9800','#E91E63','#9C27B0','#00BCD4','#FF5722','#607D8B']`

---

### 7. `OptimizationSuggestions.tsx` test + component (new)

**`src/features/finance/reports/__tests__/OptimizationSuggestions.test.tsx`:**
1. Renders one suggestion item per entry in `suggestions`.
2. Renders an empty-state message when `suggestions` is empty.

**`src/features/finance/reports/OptimizationSuggestions.tsx`:**
```tsx
export interface OptimizationSuggestionsProps {
  suggestions: OptimizationSuggestion[];
}
```
Renders a `<View>` with a subheading "Suggestions" and a list of `Typography` items showing each
`suggestion.message`. When empty, shows "No suggestions for this month." in muted style.

---

### 8. `MonthComparison.tsx` test + component (new)

**`src/features/finance/reports/__tests__/MonthComparison.test.tsx`:**
- Mock `react-native-chart-kit`
1. Renders the "vs previous month" section header.
2. Renders without crashing for a non-empty `CategoryDelta[]`.
3. Renders an empty state when `categories` is empty.

**`src/features/finance/reports/MonthComparison.tsx`:**
```tsx
export interface MonthComparisonProps {
  comparison: MonthComparison;
}
```
Renders a section with a subheading showing month labels, a `SpendingBarChart` with current + previous
values interleaved (two bars per category), and a flat list of `CategoryDelta` rows showing the
formatted `pctChange` with a color indicator (red for increase, green for decrease, muted for null).

---

### 9. `reports.hooks.ts` (new)

```ts
/**
 * Loads the weekly report for the given week start (default: current week's Monday).
 * Exposes prev/next navigation that shifts by 7 days.
 */
export function useWeeklyReport(initialWeekStart?: string): {
  report: WeeklyReport | null;
  weekStart: string;
  loading: boolean;
  error: string | null;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  isCurrentWeek: boolean;
}

/**
 * Loads the monthly report for the given month (default: current month).
 * Exposes prev/next navigation that shifts by one calendar month.
 */
export function useMonthlyReport(initialMonthISO?: string): {
  report: MonthlyReport | null;
  monthISO: string;
  loading: boolean;
  error: string | null;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  isCurrentMonth: boolean;
}
```

`currentWeekMonday()` is a private helper in the hooks file:
```ts
function currentWeekMonday(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // roll back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return toISODate(d);
}
```

---

### 10. `WeeklyReport.tsx` (new) + test

**`src/features/finance/reports/__tests__/WeeklyReport.test.tsx`:**
- Mock `reports.service` module
- Mock `react-native-chart-kit`
1. Renders the week label (e.g., "10 Jun – 16 Jun 2026") from the report.
2. Renders total spent amount with FCFA formatting.
3. Renders each top category by name.
4. Prev arrow navigates to the previous week.
5. Next arrow is disabled when viewing the current week.

**`src/features/finance/reports/WeeklyReport.tsx`:**
```tsx
export function WeeklyReport()
```
Displays:
- Week header with prev/next arrows (next disabled when `isCurrentWeek`)
- Total spent + total income summary line
- `SpendingBarChart` with `spendingByDay` (labels = abbreviated day names, values = amounts)
- "Top Categories" section: up to 3 `CategorySpend` rows with label + formatted amount + pct

Uses `useWeeklyReport()` and `ScreenHeader title="Weekly Report"` with back chevron.

---

### 11. `MonthlyReport.tsx` (new) + test

**`src/features/finance/reports/__tests__/MonthlyReport.test.tsx`:**
- Mock `reports.service` module
- Mock `react-native-chart-kit`
1. Renders the month label (e.g., "June 2026").
2. Renders formatted income total and expenses total.
3. Renders the expense performance section (planned, actual, remaining).
4. Renders `OptimizationSuggestions` (empty state when no suggestions).
5. Renders `MonthComparison` when comparison data is present.
6. Does not render `MonthComparison` when comparison is null.
7. Prev arrow navigates to the previous month.
8. Next arrow is disabled on the current month.

**`src/features/finance/reports/MonthlyReport.tsx`:**
```tsx
export function MonthlyReport()
```
A `ScrollView` displaying sections in order:
1. Month nav header (prev/next + month label)
2. Income vs expenses summary card
3. Expense performance (planned/actual/remaining with color indicator)
4. `SpendingPieChart` for category breakdown
5. Category breakdown rows (label + amount + pct)
6. Fund progress section (two FundSummary rows with ProgressBar)
7. Project progress section (each active project with ProgressBar)
8. Debt summary (lent / owed totals)
9. `MonthComparison` (only when `report.comparison !== null`)
10. `OptimizationSuggestions`
11. "View Weekly Report →" Pressable navigating to `/reports/weekly`

Uses `useMonthlyReport()`. No `ScreenHeader` (this is the tab root, not a pushed screen).

---

### 12. Route files

**`src/app/reports/weekly.tsx`** (new — thin route):
```tsx
import { WeeklyReport } from '@/features/finance/reports/WeeklyReport';
export default function WeeklyReportRoute() { return <WeeklyReport />; }
```

**`src/app/(tabs)/reports.tsx`** (modify — replace empty `<View />` with `<MonthlyReport />`):
```tsx
import { MonthlyReport } from '@/features/finance/reports/MonthlyReport';
export default function ReportsRoute() { return <MonthlyReport />; }
```

---

## Install step (before first code)

```
expo install react-native-svg
npm install react-native-chart-kit --legacy-peer-deps
```

Add to `jest.config.js` (or `package.json` jest config) `moduleNameMapper`:
```json
"react-native-chart-kit": "<rootDir>/__mocks__/react-native-chart-kit.js"
```

Create `__mocks__/react-native-chart-kit.js`:
```js
module.exports = { BarChart: 'BarChart', PieChart: 'PieChart', LineChart: 'LineChart' };
```

---

## TDD Anchors (full list)

### `reports.service.test.ts`
1. Weekly total matches sum of mocked expenses
2. Top categories sorted desc by amount; pct sum = 100
3. Peak day is highest-total date; null when no expenses
4. `spendingByDay` has exactly 7 entries; zero-filled for empty days
5. Monthly `expensePerformance.actual` matches mocked expense sum
6. Monthly `categoryBreakdown` pct values sum to 100
7. `getMonthComparison` — `pctChange` null when previous = 0
8. `getMonthComparison` — `pctChange` correct for known pair
9. `generateSuggestions` — suggestion generated for pctChange > 10
10. `generateSuggestions` — no suggestion for pctChange ≤ 10
11. `generateSuggestions` — no suggestion when pctChange is null

### `SpendingBarChart.test.tsx`
1. Renders without crashing with non-empty data
2. Renders without crashing with empty data

### `SpendingPieChart.test.tsx`
1. Renders without crashing with non-empty data
2. Renders empty state when data is empty

### `OptimizationSuggestions.test.tsx`
1. Renders one item per suggestion
2. Renders empty state when suggestions is empty

### `MonthComparison.test.tsx`
1. Renders section header
2. Renders without crashing for non-empty categories
3. Renders empty state when categories is empty

### `WeeklyReport.test.tsx`
1. Renders week label
2. Renders formatted total spent
3. Renders top category names
4. Prev arrow navigates to previous week
5. Next arrow disabled on current week

### `MonthlyReport.test.tsx`
1. Renders month label
2. Renders income and expense totals
3. Renders expense performance section
4. Renders OptimizationSuggestions (empty state)
5. Renders MonthComparison when present
6. Does not render MonthComparison when null
7. Prev arrow navigates to previous month
8. Next arrow disabled on current month

---

## Acceptance Check (Done When)

- Reports tab shows the monthly report for the current month with income, expenses, category pie chart,
  fund progress, project progress, and debt summary.
- Month-over-month comparison renders when previous-month data exists; section is absent when it doesn't.
- A suggestion message appears for any category that increased > 10% vs last month.
- The "View Weekly Report" link navigates to the weekly screen.
- Weekly screen shows total spent, daily bar chart, and top 3 categories for the current week.
- Prev/next navigation works on both screens; "next" is disabled on the current period.
- `npm test` — all new and existing tests pass; full suite stays green.
- `/check-arch` clean — only `reports → expenses, income, budget, funds, projects, debt` cross-feature
  edges; all are in the approved list.

---

## Out of Scope (Not in VS-14)

- "Consistent top category for 3 months" optimization suggestion (requires multi-month history loading).
- "Under-budget category" suggestion (requires per-category budget tracking — not in VS-12).
- Export/share report as PDF or image.
- Custom date range (beyond prev/next month or week navigation).
- Per-category budget performance bars (VS-12 deferred per-category budget table).
