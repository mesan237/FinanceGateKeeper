# ISSUE-020 — Reports Screen Visual Redesign

**Maps to:** KANBAN VS-21 (new — to be added to BACKLOG)
**Priority:** Medium
**Type:** UI redesign (presentational). No schema, no new data, no new cross-feature edges.
**Blocked by:** VS-14 Reports (✅)

---

## Source of truth

A Stitch mockup of the Reports tab supplied by the user. Four sections change; everything below
the cropped mockup (Projects, Debt, MonthComparison, OptimizationSuggestions, weekly link) is
unchanged. The redesign is **purely how existing data is presented** — every value already exists
on `MonthlyReport` ([reports.types.ts](../../src/features/finance/reports/reports.types.ts)).

## Scope Decisions (settled before drafting)

**1. No data-layer changes except one pure helper.**
All four sections render data the `MonthlyReport` already carries (`incomeTotal`,
`expensePerformance.{planned,actual,remaining}`, `categoryBreakdown[]` with `amount`+`pct`,
`fundProgress[]` with `current`/`target`/`pct`). The only new logic is the **spent-vs-planned
percentage** for the Expense Performance bar, added as a pure, unit-tested helper
`expenseSpentPct(actual, planned)` in `reports.service.ts` (mirrors `dashboard.service.spentPct`:
clamp 0–100, return 0 when `planned <= 0`). No service signature changes; `getMonthlyReport` is
untouched.

**2. The donut is a custom `react-native-svg` component, not chart-kit.**
`react-native-chart-kit`'s `PieChart` cannot render a centered total inside a hole. We already
depend on `react-native-svg@15` (and it renders fine under the test renderer — see
`SpendingPieChart.test`). A new `SpendingDonutChart.tsx` draws each slice as an arc
(`Circle` + `strokeDasharray`/`strokeDashoffset` on a shared radius) and renders a center label
slot (`TOTAL` / formatted amount / `FCFA`). The existing `SpendingPieChart.tsx` and its test are
**retired** (replaced, not left as dead code) since `MonthlyReport` is its only caller.

**3. One category palette, shared by donut slices and row dots.**
CLAUDE/feature rule: "consistent colors per category." A single feature-local
`categoryColors.ts` exports the ordered palette + `colorForIndex(i)`. Both the donut arcs and the
breakdown-row dots index into it by the category's position in `categoryBreakdown` (already sorted
by amount desc by the service), so a category's slice and its dot always match. Palette is tuned
to the mockup's calm finance look (green / navy / amber leading), drawn from existing
`@/constants/colors` where possible.

**4. Category row icon reuses the existing transaction-row icon resolution.**
The rich rows show an icon chip. Rather than invent a second icon source, reuse the same
category-icon lookup `TransactionRow` already uses (`@/constants/categoryIcons`,
keyed by category **name/label**, not id — ids drift post-dedupe). Icon chip = rounded
`SURFACE_MUTED`/light tile, consistent with the feed.

**5. The segmented Expense Performance bar reuses `ProgressBar` via a new `trackColor` prop.**
The bar shows spent (dark fill) over the remaining budget (green track). `ProgressBar` gains an
optional `trackColor` prop (default `BORDER`, fully backward-compatible); the bar renders
`value={expenseSpentPct}`, `color={dark}`, `trackColor={SUCCESS-tinted}`. Shared-component change,
covered by a `ProgressBar` test. No new bespoke bar component.

**6. Income/Expenses card and Funds restyle are inline in `MonthlyReport`.**
Uppercase labels + a hairline **vertical** divider between Income and Expenses; Funds gain a
"X% funded" sub-label, an "of <target> FCFA" right-hand line, and a green (`SUCCESS`) fill. These
are local style/markup changes — no new components.

**7. No header changes.**
The mockup's top bar (menu · "Reports" · gear) is already provided by `ScreenHeader` + the tab
layout (VS-16). The month nav row is the existing `NavArrows`. Out of scope here.

---

## Milestones (Red → Green → Refactor per step)

### M1 — Shared infra
- **ProgressBar `trackColor` prop.** Test: track renders with the passed color; defaults to
  `BORDER` when omitted (existing behavior unchanged). Files:
  [ProgressBar.tsx](../../src/components/ProgressBar.tsx),
  `src/components/__tests__/ProgressBar.test.tsx`.
- **Category palette.** New `categoryColors.ts` + test: `colorForIndex` cycles, is stable per
  index, length > 0. Files: `src/features/finance/reports/categoryColors.ts` (+ `__tests__`).

### M2 — Service helper
- `expenseSpentPct(actual, planned)`. Tests: 0 when planned ≤ 0; rounds; clamps to 100 when
  over-budget; 0 when actual 0. File: `reports.service.ts` (+ `reports.service.test.ts`).

### M3 — Donut component
- `SpendingDonutChart.tsx` (svg arcs + center total slot). Tests: renders arcs + center total for
  non-empty data (testID `spending-donut-chart`); empty-state message for `[]`. Retire
  `SpendingPieChart.tsx` + its test. Files:
  `src/features/finance/reports/SpendingDonutChart.tsx` (+ `__tests__`); delete
  `SpendingPieChart.tsx` (+ test).

### M4 — MonthlyReport wiring (RNTL)
Update [MonthlyReport.tsx](../../src/features/finance/reports/MonthlyReport.tsx) section by section:
1. Income/Expenses card — uppercase labels + vertical divider.
2. Expense Performance — segmented bar (`expenseSpentPct` + `ProgressBar trackColor`), relabel to
   "Actual Spending" / "Remaining Budget", remaining in green.
3. Spending by Category — `SpendingDonutChart` with center total; rich rows (palette dot + icon
   chip + "X% of total" sub-label + amount).
4. Funds — "X% funded" sub-label, "of <target> FCFA" right line, green fill.
- Extend `MonthlyReport.test.tsx`: bar present, donut center total renders, category row shows
  "% of total" + icon, fund "% funded" line renders. Keep existing section assertions green.

---

## Test anchor (definition of done)
- All new helpers/components have their own tests; `MonthlyReport` screen test covers each
  redesigned section's key marker.
- Full suite green (currently 695/696; the 1 known-flaky auth CHECK test is unrelated).
- `npx tsc --noEmit` clean; no `any`; every exported fn has JSDoc; files ≤ 300 lines.
- `/check-arch` clean — no new cross-feature imports (constants are shared infra).

## Files touched (summary)
| File | Change |
|---|---|
| `src/components/ProgressBar.tsx` (+test) | add `trackColor` prop |
| `src/features/finance/reports/categoryColors.ts` (+test) | new shared palette |
| `src/features/finance/reports/reports.service.ts` (+test) | `expenseSpentPct` helper |
| `src/features/finance/reports/SpendingDonutChart.tsx` (+test) | new donut |
| `src/features/finance/reports/SpendingPieChart.tsx` (+test) | **deleted** (replaced) |
| `src/features/finance/reports/MonthlyReport.tsx` (+test) | 4-section restyle |

## Out of scope
Header/tab bar, weekly report, the unchanged lower sections (Projects/Debt/Comparison/
Suggestions), any data/aggregation change, and the `expense-performance` animation polish
(could reuse the new animated `ProgressBar` fill later, but not required here).
