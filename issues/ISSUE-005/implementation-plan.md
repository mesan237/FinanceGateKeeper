# ISSUE-005 — Income Logging with Source Tagging

**Maps to:** KANBAN VS-05
**Priority:** Critical
**Blocked by:** VS-01 (✅ Done)

---

## Problem Statement

VS-03 covered money going out (expenses). VS-05 covers money coming in (income). Without income data, VS-06 (Budget Allocation) has nothing to allocate, so this slice is on the critical path to the budget engine.

Income differs from expense in three ways that matter for the schema and the UI:

1. There is no hierarchical category tree — income has a flat **source** taxonomy (`salary`, `freelance`, `ecommerce`).
2. The user logs income much less frequently than expenses (a few times a month vs. several times a day), so the form can be simpler and the history can live inline.
3. Income is the trigger for budget allocation in VS-06 — the income log screen needs to leave a clean handoff point (a callable submit that VS-06 can hook into) without doing the allocation itself yet.

## User Stories

- **As the builder,** I can navigate to "Log Income", enter `350000`, pick "Salary", optionally add a note and date, and save — and see the entry appear at the top of a recent-income list on the same screen.
- **As the builder,** I can log multiple income entries across different sources (Salary, Freelance, E-commerce) and see them tagged correctly in the list.
- **As the builder,** I can ask the service "what's the total income for this month" and get the correct number summing across all sources.

## Scope

Each bullet maps to a concrete file. Implementation order is top-to-bottom (tests precede implementation per TDD).

### Database

- `src/services/migrations/004_create_income_table.ts` — creates `income` table: `id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL, source TEXT NOT NULL CHECK(source IN ('salary','freelance','ecommerce')), note TEXT, date TEXT NOT NULL, created_at TEXT NOT NULL`. Index on `(date)` for monthly-total queries.
- `src/services/migrations/index.ts` — append the new migration to the registry (id 4).

### Feature Slice — `src/features/finance/income/`

- `income.types.ts` — exports:
  - `IncomeSource = 'salary' | 'freelance' | 'ecommerce'`
  - `Income { id: number; amount: number; source: IncomeSource; note: string | null; date: string; createdAt: string }`
  - `NewIncome = Omit<Income, 'id' | 'createdAt'>`
  - `IncomeFilter { source?: IncomeSource; from?: string; to?: string }`
- `income.service.ts` — exports:
  - `createIncome(input: NewIncome): Promise<number>` — validates (`amount > 0`, `source` is a known value) then inserts and returns the new id. Throws on invalid input so VS-06 (which will call this) can't write bad rows.
  - `getAllIncome(): Promise<Income[]>` — ordered by date DESC, created_at DESC.
  - `getIncomeBySource(source: IncomeSource): Promise<Income[]>`
  - `getIncomeByDateRange(from: string, to: string): Promise<Income[]>`
  - `getMonthlyTotal(monthISO: string): Promise<number>` — sums `amount` across all sources for the given month. `monthISO` is `"YYYY-MM"`. Returns 0 if no rows match.
- `income.hooks.ts` — exports:
  - `useIncomeLog()` — returns `{ amount, setAmount, source, setSource, note, setNote, date, setDate, submit, canSubmit, error }`. `canSubmit` is `amount > 0 && source !== null`.
  - `useIncomeHistory(filter?: IncomeFilter)` — returns `{ income, loading, error, refresh }`. Re-queries on filter change.
- `IncomeLogScreen.tsx` — top half is the form (amount, source picker via `IncomeSourcePicker`, optional note, date defaulting to today). Bottom half is a recent-income list (last 10 entries) rendered from `useIncomeHistory()`. On successful submit, clears the form and refreshes the list. No navigation away — the user stays on this screen.
- `IncomeSourcePicker.tsx` — visual selector. Three pill-shaped buttons in a row, one per source. Currently-selected pill is filled with `PRIMARY_GREEN`, others are outlined.

### Routes

- `src/app/income/log.tsx` — thin route that renders `<IncomeLogScreen />`.

### Constants

- `src/constants/incomeSources.ts` — exports `INCOME_SOURCES: ReadonlyArray<{ value: IncomeSource; label: string }>`. Used by `IncomeSourcePicker` to render and by `income.service.ts` validation. Labels: "Salary", "Freelance", "E-commerce".

## TDD Anchors

1. **income.service** — `src/features/finance/income/__tests__/income.service.test.ts`:
   - creates an income and returns the new id; `getAllIncome` includes it.
   - `getIncomeBySource('salary')` returns only salary rows.
   - `getIncomeByDateRange` filters correctly; returns empty for no match.
   - `getMonthlyTotal('2026-06')` sums correctly across mixed sources within the same month.
   - `getMonthlyTotal` ignores rows from other months; returns 0 when none match.
   - `createIncome` rejects a zero or negative amount, and rejects an unknown source string, without inserting a row.
   - amounts persist as integers.

2. **IncomeLogScreen** — `src/features/finance/income/__tests__/IncomeLogScreen.test.tsx`:
   - renders amount field, source picker (3 options), note field, date field, save button.
   - save button is disabled until amount > 0 and a source is selected.
   - pressing save calls `income.service.createIncome` once with the entered values.
   - after a successful save, the recent-income list contains the new entry tagged with the chosen source.

3. **IncomeSourcePicker** — `src/features/finance/income/__tests__/IncomeSourcePicker.test.tsx`:
   - renders one pill per `INCOME_SOURCES` entry.
   - tapping a pill calls `onChange` with that source's value.
   - the currently-selected pill is visually distinguishable (asserts via `accessibilityState.selected`).

## Acceptance Check (Done When)

- Navigating to `/income/log` shows the form with three source pills, an amount field, optional note, today's date, and a (disabled) Save button.
- Entering `350000` and selecting "Salary" enables Save. Pressing Save clears the form; the new entry appears in the recent-income list as "350 000 FCFA · Salary · 12 Jun".
- Entering `75000` and selecting "Freelance" produces a second entry; both rows are visible, each tagged correctly.
- A unit test asserts `getMonthlyTotal('2026-06')` returns `425000` after those two saves.
- `npm test` — all three test files pass.

## Design Decisions (Locked During Grill Me)

- **`source` is a `TEXT` column with a `CHECK` constraint, not a foreign-key into a separate `income_sources` table.** Rejected alt: a sources table mirroring categories. Why: income sources are a closed enum (three values, set in the PRD), they don't have hierarchy, and the user has no UI affordance to add custom sources. A CHECK keeps the schema honest without the join overhead.
- **Recent-income history lives inline on `IncomeLogScreen`, not on a dedicated history route.** Rejected alt: `app/income/index.tsx` history route. Why: KANBAN's Done When says "see both in a history list" — the inline list satisfies that with fewer files and fewer navigation transitions. If a dedicated screen becomes useful later (e.g. when filters get richer), promoting the inline list is cheap.
- **No allocation screen wiring in this slice.** The architecture's cross-feature table says `income → budget` triggers allocation; that wire-up lives with VS-06 (Budget Allocation), which will modify `IncomeLogScreen`'s submit handler to navigate to `/income/allocate` after save. VS-05 ships a stand-alone submit.
- **Service layer validates source against `INCOME_SOURCES`, not just the TS union type.** TS only checks at compile time; runtime callers (e.g. a future Supabase sync) could pass arbitrary strings. The runtime check defends the DB.
- **Migration is numbered `004_*`.** VS-03 used 001–003 (categories, expenses, is_hidden flag). Income is next.
- **`getMonthlyTotal` takes a string `"YYYY-MM"`, not a `Date` or a `(year, month)` tuple.** Matches how budget allocations and reports will key their data in later slices, and lets the SQL `WHERE date LIKE '2026-06-%'` predicate use an index on `(date)`.
- **No "edit income" or "delete income" affordance in this slice.** Rejected alt: full CRUD. Why: KANBAN VS-05 scope is create + read only. Edit/delete arrive when there's a real need (likely VS-15 sync resolution or a stand-alone polish slice). Don't pre-design.
- **`useIncomeLog` clears the form on successful save and keeps the user on the screen.** Rejected alt: navigate back. Why: the user typically logs multiple income entries in one sitting (salary + freelance + ecommerce on payday); staying on the screen reduces friction.

## Out of Scope (Deferred)

- Budget allocation triggered by income save → VS-06.
- Edit/delete income entries → later polish slice or VS-15.
- Income from non-enum sources (gifts, investment returns, etc.) → would require a follow-up slice that turns the source into a CRUD-able list.
- Charts of income trends → VS-14.
- PIN gate around the log screen → VS-02 (will wrap the whole app, not this route specifically).

## After This Slice

Run `/check-arch` and the `code-reviewer` subagent. Then mark VS-05 as `✅ Done` in `docs/KANBAN.md` and delete this issue file (or move to `issues/done/`).
