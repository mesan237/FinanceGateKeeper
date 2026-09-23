# ISSUE-003 — Log Expense with Category & View Transactions

**Maps to:** KANBAN VS-03
**Priority:** Critical — tracer bullet. Unlocks VS-04, VS-06, VS-07, VS-08, VS-12, VS-13, VS-14, VS-15.
**Blocked by:** VS-01 (✅ Done). VS-02 is not a blocker but its route gates are already in place, so the new screens render only after PIN unlock.

---

## Problem Statement

The app currently has a tab bar, a PIN gate, and an empty `transactions` placeholder route. There is no way to record an expense, no category data in the database, no shared currency/date formatters, and the `expenses` feature slice has only a `.gitkeep`. Until the end-to-end flow "open the app → log an expense → see it in the transactions tab" works, every dependent slice (budget allocation, dashboard, reports, sync) is blocked.

## User Stories

- **As the user, in the expense log screen,** I can type an amount in FCFA, choose a top-level category (e.g. *Food & Drink*) and optionally a subcategory (e.g. *Eating out*), add an optional note, accept today's date or pick another, tap **Save**, and land back on the transactions tab with the new row at the top.
- **As the user, in the transactions tab,** I see every expense I have logged in reverse-chronological order with its category, subcategory, formatted FCFA amount, and date. When I haven't logged anything yet I see a clear empty state instead of a blank list.
- **As the user,** I can filter the transactions list by category and by date range (start/end). Filters compose (category AND range) and clear individually.

## Scope

Each bullet maps to a concrete file. Implementation order is top-to-bottom; tests precede implementation per TDD.

### Constants
- `src/constants/categories.ts` — `DEFAULT_CATEGORIES`: typed array describing the seed tree (parent + children) from `src/features/finance/expenses/CLAUDE.md`. Each entry has `{ name, sort_order, children: string[] }`. Single source of truth used by both the seed migration and tests.

### Utils
- `src/utils/formatCurrency.ts` — `formatCurrency(amountInFcfa: number): string`. Integer-only input (rounds + warns if a non-integer slips in), thousands-separated with a non-breaking space (e.g. `1 250 FCFA`), preserves a leading `-` for negatives, returns `0 FCFA` for `0`. Reads the suffix from `DEFAULT_CURRENCY` in `constants/config.ts`.
- `src/utils/formatDate.ts` — `formatIsoDate(iso: string): string` returning `DD MMM YYYY` (e.g. `30 May 2026`) and `todayIso(): string` returning `YYYY-MM-DD` for the local day. Both are pure and locale-free.
- `src/utils/__tests__/formatCurrency.test.ts` and `src/utils/__tests__/formatDate.test.ts` — cover the cases listed in TDD Anchors.

### Database Layer
- `src/services/migrations/003_create_categories_table.ts` — single SQL up:
  ```sql
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    is_default INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (name, parent_id)
  );
  CREATE INDEX idx_categories_parent ON categories(parent_id);
  ```
  `parent_id IS NULL` ⇒ top-level category; non-null ⇒ subcategory.
- `src/services/migrations/004_create_expenses_table.ts`:
  ```sql
  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount INTEGER NOT NULL CHECK (amount > 0),
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory_id INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
    note TEXT,
    date TEXT NOT NULL,                    -- ISO YYYY-MM-DD
    is_recurring INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX idx_expenses_date ON expenses(date);
  CREATE INDEX idx_expenses_category ON expenses(category_id);
  ```
- `src/services/migrations/005_seed_default_categories.ts` — idempotent seed. Reads `DEFAULT_CATEGORIES` from `@/constants/categories`. Skips if `SELECT 1 FROM categories WHERE is_default = 1 LIMIT 1` returns a row. Inserts parents first, then children, all with `is_default = 1`.
- `src/services/migrations/index.ts` — register migrations 3, 4, 5 in order.
- `src/services/migrations/__tests__/003_005_categories_expenses.test.ts` — using the same `better-sqlite3 + runMigrations` harness as the existing tests: assert (a) `categories` and `expenses` tables exist with the expected columns, (b) the seed creates the eight top-level defaults with the expected child counts, (c) running migrations a second time on the same DB does not duplicate the seed, (d) `CHECK (amount > 0)` rejects an insert of `0`.

### Expenses Feature Slice (`src/features/finance/expenses/`)

Files mirror the pattern from the auth slice (typed deps, service is React-free).

- `expenses.types.ts`:
  ```ts
  export interface Category {
    id: number;
    name: string;
    parent_id: number | null;
    is_default: boolean;
    sort_order: number;
  }
  export interface Subcategory extends Category { parent_id: number; }
  export interface Expense {
    id: number;
    amount: number;                  // FCFA integer
    category_id: number;
    subcategory_id: number | null;
    note: string | null;
    date: string;                    // YYYY-MM-DD
    is_recurring: boolean;
    created_at: string;              // ISO 8601
  }
  export interface ExpenseDraft {
    amount: number;
    category_id: number;
    subcategory_id?: number | null;
    note?: string | null;
    date: string;
  }
  export interface ExpenseFilters {
    categoryId?: number | null;
    startDate?: string | null;       // inclusive
    endDate?: string | null;         // inclusive
  }
  export interface ExpenseWithCategory extends Expense {
    category_name: string;
    subcategory_name: string | null;
  }
  export interface ExpensesServiceDeps {
    driver: SqliteDriver;
    now?: () => string;              // injectable clock for tests
  }
  ```

- `expenses.service.ts` — exports pure async functions, each accepting `deps: ExpensesServiceDeps`:
  - `listCategories(deps)` → `Category[]`, ordered by `sort_order, name`.
  - `listSubcategories(parentId, deps)` → `Subcategory[]`.
  - `createExpense(draft, deps)` → `Expense` (rounds `amount`, validates `amount > 0` and `Number.isFinite`, validates `date` matches `YYYY-MM-DD`, inserts and returns the new row).
  - `listExpenses(filters, deps)` → `ExpenseWithCategory[]`. SQL joins `expenses` to `categories` twice (category + subcategory). Filters compose into a single `WHERE`. Order: `date DESC, id DESC`.
  Every exported function carries a one-line JSDoc per CLAUDE.md.

- `expenses.hooks.ts`:
  - `useCategories()` — loads `listCategories` once on mount, caches in state, exposes `{ categories, isLoading }`.
  - `useExpenseLog()` — manages form state (`amount, categoryId, subcategoryId, note, date`), `validate()` (amount > 0, category required), `submit()` that calls `createExpense` and returns the saved row.
  - `useTransactions(filters)` — loads `listExpenses` whenever `filters` changes (stable shallow compare), exposes `{ transactions, isLoading, refresh }`.
  All three hooks accept an optional `deps` prop for tests; in production they call `getDriver()` once and memoise it.

- `CategoryPicker.tsx` — controlled component. Props: `{ categories, value: { categoryId, subcategoryId }, onChange }`. Renders a list of top-level categories; tapping one expands its subcategories inline. `testID="category-picker"`. Empty subcategory list is allowed (just no second row of chips).

- `ExpenseLogScreen.tsx` — form using shared `TextInput`, `CategoryPicker`, `Button`. Validation messages render inline with `testID="amount-error"` / `testID="category-error"`. On success, calls `router.replace('/(tabs)/transactions')` so the back button does not return to the form.

- `TransactionList.tsx` — pure list view. Props: `{ transactions, filters, onFiltersChange }`. Uses `FlatList`. Renders empty-state `Typography` when `transactions.length === 0`. Filters row: a category dropdown (re-using `CategoryPicker` collapsed mode → top-level only) and two date `TextInput`s validated as `YYYY-MM-DD`. A "Clear" button resets `filters` to `{}`.

### Routing Skeleton
- `src/app/expenses/log.tsx` — `import { ExpenseLogScreen } from '@/features/finance/expenses/ExpenseLogScreen'; export default function ExpenseLogRoute() { return <ExpenseLogScreen />; }`.
- `src/app/(tabs)/transactions.tsx` — replace the `<View />` placeholder with a thin route rendering `<TransactionsScreen />`. **Add** `src/features/finance/expenses/TransactionsScreen.tsx` which wires `useTransactions` to `<TransactionList />` (the list itself stays presentational so it remains trivially testable).
- `src/app/(tabs)/dashboard.tsx` — out of scope; do **not** add the "log expense" shortcut here (lives in VS-13).

### TDD Anchors

Failing tests are written first. The slice is Done when they all pass alongside the existing 40.

#### 1. `src/utils/__tests__/formatCurrency.test.ts`
- `formatCurrency(0)` → `'0 FCFA'`.
- `formatCurrency(1500)` → `'1 500 FCFA'` (thousands separated with NBSP).
- `formatCurrency(1234567)` → `'1 234 567 FCFA'`.
- `formatCurrency(-2500)` → `'-2 500 FCFA'`.
- `formatCurrency(1500.4)` rounds to `1500` and emits `'1 500 FCFA'`.

#### 2. `src/utils/__tests__/formatDate.test.ts`
- `formatIsoDate('2026-05-30')` → `'30 May 2026'`.
- `formatIsoDate('2026-01-01')` → `'01 Jan 2026'`.
- `todayIso()` returns a `YYYY-MM-DD` string matching `Date.now()`'s local day (mock `Date` in the test).

#### 3. `src/services/migrations/__tests__/003_005_categories_expenses.test.ts`
- After running every registered migration, `PRAGMA table_info(expenses)` includes the expected columns.
- The seed produces exactly the 8 top-level defaults and the expected subcategory counts per parent (e.g. *Food & Drink* has 4 children).
- Re-running migrations on the same DB leaves seed row counts unchanged.
- `INSERT INTO expenses (..., amount=0, ...)` rejects with a `CHECK` violation.

#### 4. `src/features/finance/expenses/__tests__/expenses.service.test.ts`
Uses `better-sqlite3 + runMigrations` exactly like `auth.service.test.ts`.
- `listCategories` returns the seeded top-level rows in `sort_order` order.
- `listSubcategories(parentId)` returns only that parent's children.
- `createExpense` with `amount = 0` rejects.
- `createExpense` with a non-finite `amount` rejects.
- `createExpense` with a malformed `date` rejects.
- `createExpense` with valid input inserts the row and returns the new `Expense` (id present, `is_recurring === false`, `created_at` from injected `now()`).
- `listExpenses({})` returns all rows joined to category names in `date DESC, id DESC` order.
- `listExpenses({ categoryId })` filters to that category.
- `listExpenses({ startDate, endDate })` is inclusive on both ends.
- `listExpenses({ categoryId, startDate, endDate })` composes both filters.
- `listExpenses({})` on an empty DB returns `[]`.

#### 5. `src/features/finance/expenses/__tests__/expenses.hooks.test.tsx`
- `useExpenseLog().validate()` rejects amount `0` and missing `categoryId` with named errors.
- `useExpenseLog().submit()` calls `createExpense` via injected deps and resolves with the saved row.
- `useTransactions({})` exposes the seeded `[]` after mount, then re-runs `listExpenses` when `filters` change.

#### 6. `src/features/finance/expenses/__tests__/ExpenseLogScreen.test.tsx`
- Renders amount input, category picker, save button.
- Tapping **Save** with empty amount surfaces `getByTestId('amount-error')`.
- Tapping **Save** with no category surfaces `getByTestId('category-error')`.
- Filling amount + selecting category + tapping **Save** calls the injected `createExpense` once.

#### 7. `src/features/finance/expenses/__tests__/TransactionList.test.tsx`
- Empty `transactions` renders the empty-state copy `'No transactions yet.'`.
- Non-empty `transactions` renders each row with category name and `formatCurrency` output.
- Changing the category filter calls `onFiltersChange` with the new `categoryId`.
- Tapping **Clear** calls `onFiltersChange({})`.

The screen tests inject deps via React context-less prop passing (`<ExpenseLogScreen deps={...} />` optional prop) so they never touch SQLite. Mirrors the `AuthScreen` test pattern.

## Acceptance Check (Done When)

- `npm test` passes: existing 40 plus the new tests above.
- `npx expo start` on a fresh DB:
  1. PIN unlock → tabs.
  2. Navigate from transactions tab to `/expenses/log` (a temporary in-screen `Button` in the transactions tab's empty state is acceptable for VS-03; VS-13 introduces the proper Quick Action bar).
  3. Save an expense: `1 500 FCFA · Food & Drink › Eating out · 30 May 2026`.
  4. Returned to transactions tab, the row appears at the top with that exact formatted amount.
- `/check-arch` passes (no forbidden imports).
- `code-reviewer` subagent returns no `BLOCK` findings.
- VS-03 marked `✅ Done` in `docs/KANBAN.md`.

## Design Decisions (alternatives rejected)

1. **Subcategories live in the same `categories` table via self-referencing `parent_id`** instead of a separate `subcategories` table. The CLAUDE.md schema and the seed list use one shape for both; a single table keeps the picker query trivial (`WHERE parent_id = ?`) and lets VS-04 add custom subcategories without a parallel migration.
2. **Amount stored as `INTEGER` with a `CHECK (amount > 0)` constraint.** Matches the FCFA-no-decimals rule (`services/CLAUDE.md`) and pushes the "no zero expenses" invariant into the database — service validation still runs first for a friendlier error, but the DB is the floor.
3. **`ON DELETE RESTRICT` for `category_id`** (not `CASCADE` or `SET NULL`). VS-04 explicitly requires a reassignment prompt when deleting a category that has expenses; cascading would silently destroy financial history.
4. **Seed lives in its own migration (`005`) instead of inside `003`.** Lets us re-run the seed idempotently in the future without touching the DDL migration, and keeps each migration single-purpose so failures are surgical.
5. **`DEFAULT_CATEGORIES` lives in `constants/`, not the migration file.** Constants can be imported by tests and (later) by the category picker fallback path; migrations can't be cleanly imported outside the runner.
6. **Services accept `deps: { driver, now? }` via dependency injection**, mirroring the auth slice. Tests use `better-sqlite3 + createBetterSqliteDriver`; runtime uses `getDriver()`. Rejected alt: a module-scoped `getDriver()` call — would force every test to mock the import path, which the auth slice already avoids.
7. **Filtering happens in SQL, not in JavaScript.** Even with a few hundred expenses the join + index path is faster, and SQL-level filters compose with `WHERE … AND …` without an array re-allocation. Rejected alt: load all rows, filter in `useTransactions` — would break once a year of data sits in the DB.
8. **`TransactionList` is presentational; `TransactionsScreen` is the container.** Keeps the list trivially renderable in tests with hard-coded data and lets VS-13's dashboard reuse `TransactionList` for its "recent transactions" card without dragging in the hook.
9. **`router.replace` (not `router.push`) after save** so the back gesture from `transactions` doesn't pop back into a stale form. Standard Expo Router pattern for one-shot create flows.
10. **NBSP thousands separator** (`' '`) rather than a regular space or comma. Prevents the number from wrapping mid-amount on narrow screens (common on Android), and FCFA convention in West Africa uses a space — not the US comma. Locked because all later FCFA-displaying components (budget overview, dashboard cards, reports) will inherit this format.

## Out of Scope (Deferred)

- Adding / renaming / deleting custom categories → **VS-04**.
- Quick-add templates and recurring expenses → **VS-07**.
- Zero-day prompt → **VS-08**.
- Over-budget warning before save → **VS-12**.
- Editing or deleting an existing expense from the transactions list — not in VS-03's stories; add when the user asks for it.
- Wiring a "Log Expense" quick action onto the dashboard → **VS-13**.

## After This Slice

- Run `/check-arch` and invoke the `code-reviewer` subagent on the branch diff.
- Mark VS-03 as `✅ Done` in `docs/KANBAN.md` (status template row).
- The issue file at `issues/ISSUE-003/` is deleted by the user after on-device verification.
