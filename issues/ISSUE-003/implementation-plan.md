# ISSUE-003 — Log Expense with Category & View Transactions

**Maps to:** KANBAN VS-03
**Priority:** Critical — tracer bullet (thin end-to-end slice that proves the architecture works)
**Blocked by:** VS-01 (✅ Done)

---

## Problem Statement

VS-01 left the app with a working tab shell, a SQLite migration runner, and shared primitives — but no feature actually exercises that stack end-to-end. Until one slice cuts cleanly through migration → service → hook → UI → route → display, the architecture is unproven and every subsequent slice would be making bets against an unverified pattern.

VS-03 is the tracer bullet: the smallest piece of real domain logic (expense logging) that touches every layer. After this slice, the path from "user enters data" to "user sees it back" is wired and tested, and VS-04, VS-06, VS-07, VS-08, VS-12 can extend it instead of re-deriving it.

## User Stories

- **As the builder,** I can tap "+ Log Expense" from the Transactions tab, enter `1500`, pick "Food → Restaurant", optionally add a note, and save — and see the entry appear in the transaction list formatted as "1 500 FCFA".
- **As the builder,** I can filter the transaction list by category and by date range and see only matching entries.
- **As the builder,** I can launch the app, navigate to Transactions, and see every expense I've previously logged sorted newest-first.

## Scope

Each bullet maps to a concrete file. Implementation order is top-to-bottom (tests precede implementation per TDD).

### Database

- `src/services/migrations/001_create_categories_table.ts` — creates `categories` table: `id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, parent_id INTEGER REFERENCES categories(id), is_default INTEGER NOT NULL DEFAULT 0`. Seeds the default category tree from `@/constants/categories`.
- `src/services/migrations/002_create_expenses_table.ts` — creates `expenses` table: `id INTEGER PRIMARY KEY AUTOINCREMENT, amount INTEGER NOT NULL, category_id INTEGER NOT NULL REFERENCES categories(id), subcategory_id INTEGER REFERENCES categories(id), note TEXT, date TEXT NOT NULL, is_recurring INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL`. Indexes on `(date)` and `(category_id)`.
- `src/services/migrations/index.ts` — register both new migrations in order.

### Constants

- `src/constants/categories.ts` — exports `DEFAULT_CATEGORIES`: array of `{ name, subcategories: string[] }`. Seed list:
  - Food → Groceries, Restaurant, Snacks
  - Transport → Taxi, Fuel, Public Transport
  - Bills → Rent, Electricity, Water, Internet, Phone
  - Health → Pharmacy, Doctor
  - Entertainment → Streaming, Outings
  - Education → Books, Courses
  - Shopping → Clothing, Household
  - Other → Miscellaneous

### Feature Slice — `src/features/finance/expenses/`

- `expenses.types.ts` — exports:
  - `Category { id: number; name: string; parentId: number | null; isDefault: boolean }`
  - `Subcategory` is `Category` with `parentId !== null` (alias, no separate type)
  - `Expense { id: number; amount: number; categoryId: number; subcategoryId: number | null; note: string | null; date: string; isRecurring: boolean; createdAt: string }`
  - `NewExpense = Omit<Expense, 'id' | 'createdAt'>`
  - `TransactionFilter { categoryId?: number; from?: string; to?: string }`
- `expenses.service.ts` — exports:
  - `createExpense(input: NewExpense): Promise<number>` — validates (`amount > 0`, `categoryId` present) then inserts row, returns id. Throws on invalid input so callers that bypass `useExpenseLog` (e.g. VS-07 quick-add / recurring auto-log) can't write bad rows.
  - `getAllExpenses(): Promise<Expense[]>` — ordered by date DESC, created_at DESC
  - `getExpensesByDateRange(from: string, to: string): Promise<Expense[]>`
  - `getExpensesByCategory(categoryId: number): Promise<Expense[]>`
  - `getCategories(): Promise<Category[]>` — returns parent categories
  - `getSubcategories(parentId: number): Promise<Category[]>`
- `expenses.hooks.ts` — exports:
  - `useExpenseLog()` — returns `{ amount, setAmount, categoryId, setCategoryId, subcategoryId, setSubcategoryId, note, setNote, date, setDate, submit, canSubmit, error }`. Validates `amount > 0` and `categoryId !== null` before allowing submit.
  - `useTransactions(filter?: TransactionFilter)` — returns `{ expenses, loading, error, refresh }`. Re-queries when filter changes.
  - `useCategories()` — returns `{ categories, subcategoriesOf, loading }`. Loads parents and exposes a lazy fetcher for children.
- `CategoryPicker.tsx` — modal-based picker. Tapping a parent category drills into subcategories. Selecting either commits and closes. Uses the shared `<Modal>` primitive.
- `ExpenseLogScreen.tsx` — form: amount (numeric `<TextInput>`), category trigger (opens `CategoryPicker`), optional note, date (defaults to today via `formatDate.toISODate(new Date())`), Save button. Wired via `useExpenseLog`. On success, navigates back to `/(tabs)/transactions`.
- `TransactionList.tsx` — chronological list. Each row shows the category label (subcategory name when `subcategoryId` is set, else the parent category name), FCFA-formatted amount (via `formatCurrency`), short date. Filter chips at the top: category dropdown + date range. Empty state when no transactions match.

### Routes

- `src/app/expenses/log.tsx` — thin route, renders `<ExpenseLogScreen />`.
- `src/app/(tabs)/transactions.tsx` — modified to render `<TransactionList />` plus a floating "+ Log Expense" button that navigates to `/expenses/log`.

### Utilities

- `src/utils/formatCurrency.ts` — `formatCurrency(value: number): string`. Returns `"<value with space-separated thousands> FCFA"`. Handles zero, negatives, large numbers. Space separator is the West/Central African convention (FR-style).
- `src/utils/formatDate.ts` — exports:
  - `toISODate(d: Date): string` — `"YYYY-MM-DD"`
  - `formatDateShort(d: Date | string): string` — `"12 Jun"`
  - `formatDateLong(d: Date | string): string` — `"12 June 2026"`

## TDD Anchors

These are the failing tests to write first. Implementation is done when they all pass.

1. **expenses.service** — `src/features/finance/expenses/__tests__/expenses.service.test.ts`:
   - creates an expense and returns the new id; subsequent `getAllExpenses` includes it
   - `getExpensesByDateRange` filters correctly; returns empty for no match
   - `getExpensesByCategory` filters correctly; returns empty for unknown category
   - `getCategories` and `getSubcategories(parentId)` return the seeded defaults after migrations run
   - amounts are persisted as integers (no decimal coercion)
   - `createExpense` rejects a zero or negative amount, and rejects a missing category, without inserting a row

2. **formatCurrency** — `src/utils/__tests__/formatCurrency.test.ts`:
   - `formatCurrency(0)` → `"0 FCFA"`
   - `formatCurrency(1500)` → `"1 500 FCFA"`
   - `formatCurrency(150000)` → `"150 000 FCFA"`
   - `formatCurrency(-2000)` → `"-2 000 FCFA"`
   - `formatCurrency(1234567)` → `"1 234 567 FCFA"`

3. **formatDate** — `src/utils/__tests__/formatDate.test.ts`:
   - `toISODate(new Date('2026-06-12T15:00:00Z'))` → `"2026-06-12"` (UTC-stable)
   - `formatDateShort('2026-06-12')` → `"12 Jun"`

4. **ExpenseLogScreen** — `src/features/finance/expenses/__tests__/ExpenseLogScreen.test.tsx`:
   - renders amount field, category trigger, note field, save button
   - save button is disabled until amount > 0 and category is set
   - pressing save calls `expenses.service.createExpense` once with the entered values

5. **TransactionList** — `src/features/finance/expenses/__tests__/TransactionList.test.tsx`:
   - renders one row per expense in date-DESC order
   - filtering by category hides non-matching rows
   - empty state message shows when no expenses match

## Acceptance Check (Done When)

- App launches; tapping the Transactions tab shows an empty list with a "+ Log Expense" CTA.
- Tapping "+ Log Expense" opens the log screen with a category picker populated by the seeded defaults.
- Logging `1500` under "Food → Restaurant" returns to the Transactions tab and shows `"1 500 FCFA · Restaurant · 12 Jun"`.
- Logging additional expenses across multiple days, then filtering by "Food" hides non-Food rows.
- `npm test` — all five test files pass.

## Design Decisions (Locked During Grill Me)

- **Seed default categories inside `001_create_categories_table.ts`, not in service code.** Rejected alt: service-layer seeding on first launch. Why: the migration is atomic with table creation and runs exactly once per device; service seeding would need its own "have we seeded?" check, duplicating the migration ledger.
- **Amounts stored as plain integers in FCFA.** No cents, no decimals. Per `src/services/CLAUDE.md` and AGENTS.md FCFA-only mandate.
- **Dates stored as ISO 8601 strings (`YYYY-MM-DD` for `expense.date`, `YYYY-MM-DDTHH:mm:ss.sssZ` for `created_at`).** Avoids SQLite's loose date typing and lets us range-filter with simple string comparison.
- **Subcategories share the `categories` table via `parent_id` self-reference, not a separate `subcategories` table.** One table, simpler joins; the `parent_id IS NULL` predicate distinguishes parents from children. Rejected alt: two tables. Why: subcategory schema would mirror category schema exactly; the tree depth is fixed at 2 so recursion isn't a concern.
- **Migration numbering starts at 001 in this slice, not 003.** VS-01 left the migrations registry empty; this slice gets first claim. VS-02 (when implemented) will use the next available number at that time.
- **`useExpenseLog` exposes individual field setters, not a form-state object.** Matches the shape later slices (VS-04, VS-07) will reuse. Rejected alt: react-hook-form or formik. Why: dependency bloat for a six-field form.
- **CategoryPicker is a `<Modal>`-based drill-down, not a full screen.** The modal keeps the user's amount/note context visible underneath. Two stages: parents → subcategories.
- **Currency formatting uses space-separated thousands.** West/Central African convention (also used in France/Canada-FR). Rejected alt: comma-separated. Why: matches user locale.
- **TransactionList filters live in `useTransactions(filter)` (server-side SQL), not in-memory.** Rejected alt: load everything, filter in JS. Why: even for a single user, transaction counts grow unboundedly; SQL-side filtering keeps memory flat.
- **No `is_recurring = true` rows created in this slice.** The column exists for VS-07 but every VS-03 expense is `false`. Documenting the column now avoids a migration churn later.
- **Floating "+ Log Expense" button lives on `(tabs)/transactions.tsx` (not on dashboard).** Dashboard quick-actions arrive in VS-13; the transactions tab is the natural home for VS-03's entry point.

## Out of Scope (Deferred)

- Category CRUD (add/edit/delete custom categories) → VS-04.
- Quick-add templates and recurring expenses → VS-07.
- Budget allocation, remaining-budget display → VS-06.
- Over-budget alerts → VS-12.
- Zero-day confirmation → VS-08.
- Charts / report generation from expenses → VS-14.
- PIN gate around the log screen → VS-02 (will wrap the whole app, not this route specifically).

## After This Slice

Run `/check-arch` and the `code-reviewer` subagent. Then mark VS-03 as `✅ Done` in `docs/KANBAN.md` and delete this issue file (or move to `issues/done/`).
