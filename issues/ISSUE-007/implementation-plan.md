# ISSUE-007 — Quick-Add & Recurring Expenses

**Maps to:** KANBAN VS-07
**Priority:** Medium
**Blocked by:** VS-03 (✅ Done)

---

## Problem Statement

Expense logging today is a four-step form (amount → category → optional note → save). For the two expense classes that dominate daily volume — **frequent identical purchases** ("Taxi 500", "Lunch 1,500") and **predictable recurring bills** (rent, phone data, electricity) — that form is friction that loses logs. Two surfaces fix that:

1. **Quick-add templates**: pre-filled (label + amount + category) one-tap shortcuts. Tap a tile → expense is logged instantly. No form, no confirmation.
2. **Recurring expenses**: registered once with a frequency and a next-due-date. The app auto-logs them on or after the due date the next time the user opens it, so a rent payment can't silently disappear from the budget because the user forgot to enter it.

Two constraints shape the design:

- **Auto-log must be idempotent and replay-safe.** If the app is opened twice in one day, recurring expenses are logged exactly once per occurrence. If the app is closed for three months, every missed occurrence inside that window is logged on next open.
- **Skip must not become "delete".** A skipped occurrence advances the next-due-date by one period but logs nothing. The recurring record itself stays active.

## User Stories

- **As the builder,** I can tap a "Taxi 500" tile from the Quick Add screen and see the expense appear in the transactions list immediately.
- **As the builder,** I can add a new quick-add template ("Lunch 1,500", category Food → Restaurant) and have it appear as a new tile that I can tap thereafter.
- **As the builder,** I can long-press an existing tile to rename it, change its amount/category, or delete it.
- **As the builder,** I can register a monthly recurring expense ("Rent 150,000", first due `2026-07-01`). When I open the app on `2026-07-01` or later, the rent is auto-logged and the next due date advances to `2026-08-01`.
- **As the builder,** I can mark a recurring expense as **inactive** so it stops auto-logging without me losing the template, and reactivate it later.
- **As the builder,** I can **skip** the next occurrence of a recurring expense (e.g. "I won't pay rent this month") so nothing is logged but the schedule advances one period.

## Scope

Each bullet maps to a concrete file. Implementation order is top-to-bottom (tests precede implementation per TDD).

### Database

- `src/services/migrations/006_create_quick_add_templates_table.ts` — `quick_add_templates` table:
  `id INTEGER PK AUTOINCREMENT, label TEXT NOT NULL, amount INTEGER NOT NULL, category_id INTEGER NOT NULL REFERENCES categories(id), subcategory_id INTEGER REFERENCES categories(id), sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL`.
- `src/services/migrations/007_create_recurring_expenses_table.ts` — `recurring_expenses` table:
  `id INTEGER PK AUTOINCREMENT, label TEXT NOT NULL, amount INTEGER NOT NULL, category_id INTEGER NOT NULL REFERENCES categories(id), subcategory_id INTEGER REFERENCES categories(id), frequency TEXT NOT NULL CHECK(frequency IN ('monthly','weekly')), next_due_date TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL`. Index on `(is_active, next_due_date)` to back the auto-log query.
- `src/services/migrations/index.ts` — append both migrations to the registry (ids 6, 7).

### Types

Added to `src/features/finance/expenses/expenses.types.ts`:

- `Frequency = 'monthly' | 'weekly'`.
- `QuickAddTemplate { id: number; label: string; amount: number; categoryId: number; subcategoryId: number | null; sortOrder: number; createdAt: string }`.
- `NewQuickAddTemplate = Omit<QuickAddTemplate, 'id' | 'sortOrder' | 'createdAt'>`.
- `RecurringExpense { id: number; label: string; amount: number; categoryId: number; subcategoryId: number | null; frequency: Frequency; nextDueDate: string; isActive: boolean; createdAt: string }`.
- `NewRecurringExpense = Omit<RecurringExpense, 'id' | 'createdAt'>`.

### Service — additions to `expenses.service.ts`

Quick-add templates:

- `createQuickAddTemplate(input: NewQuickAddTemplate): Promise<number>` — validates `amount > 0` integer, non-empty trimmed label, existing category. Inserts and returns id, appended after existing siblings via `sort_order`.
- `getQuickAddTemplates(): Promise<QuickAddTemplate[]>` — ordered by `sort_order, id`.
- `updateQuickAddTemplate(id: number, patch: Partial<NewQuickAddTemplate>): Promise<void>` — same validation. No-op on empty patch.
- `deleteQuickAddTemplate(id: number): Promise<void>` — hard delete; templates have no historical reference (the logged expense is the durable record).
- `logFromQuickAddTemplate(id: number, dateISO?: string): Promise<number>` — looks up the template, inserts a non-recurring expense with today's date (or `dateISO`) via the existing `createExpense`. Throws if the template is missing.

Recurring expenses:

- `createRecurringExpense(input: NewRecurringExpense): Promise<number>` — validates amount, label, category, `nextDueDate` shape (`YYYY-MM-DD`). Defaults `isActive` true.
- `getRecurringExpenses(): Promise<RecurringExpense[]>` — ordered by `next_due_date ASC, id`.
- `updateRecurringExpense(id: number, patch: Partial<NewRecurringExpense>): Promise<void>` — re-validates touched fields.
- `setRecurringActive(id: number, isActive: boolean): Promise<void>` — toggle, leaves `next_due_date` untouched.
- `deleteRecurringExpense(id: number): Promise<void>` — hard delete; the logged expense rows remain.
- `skipRecurringOccurrence(id: number): Promise<void>` — advances `next_due_date` by one period of the row's frequency without logging an expense. No-op for inactive rows? **Throws** — skipping an inactive entry is almost certainly user error; let the UI re-enable first.
- `runRecurringAutoLog(todayISO?: string): Promise<{ loggedCount: number }>` — the core auto-log. For each active row whose `next_due_date <= todayISO` (default: today), insert an expense with `isRecurring: true, date = next_due_date`, advance `next_due_date` by one period, and repeat until `next_due_date > todayISO`. Returns the count of expenses logged. Idempotent: a second call on the same day logs zero. Per-row work is wrapped in a transaction so a crash mid-row doesn't leave a logged expense without its advanced due date.

Helper (internal):

- `advanceDueDate(iso: string, frequency: Frequency): string` — pure date math. Monthly clamps the day to the target month's last day (so `2026-01-31 + 1 month = 2026-02-28`); weekly adds 7 days. UTC-stable.

### Hooks — additions to `expenses.hooks.ts`

- `useQuickAdd()` — `{ templates, loading, error, refresh, log, add, update, remove }`. `log(id)` calls `logFromQuickAddTemplate`. Mutations re-fetch on success.
- `useRecurring()` — `{ recurring, loading, error, refresh, add, update, setActive, skip, remove }`. Mutations re-fetch.

### Feature Components — `src/features/finance/expenses/`

- `QuickAddScreen.tsx` — heading "Quick Add", a grid of tiles (one per template), and a final "+" tile that opens the template-create modal. Tapping a template tile calls `useQuickAdd().log(template.id)` and shows a transient confirmation (auto-dismissed). Long-pressing a tile opens the same modal in "edit" mode (pre-filled). The modal has a Delete button when editing.
- `QuickAddTemplateForm.tsx` — modal form: label, amount, category (via the existing `CategoryPicker`). Save / Cancel / Delete (edit only). Save validates locally before calling `add` or `update`.
- `RecurringExpensesScreen.tsx` — heading "Recurring Expenses", a list of rows (label, amount, next due date, frequency badge). Each row has an active/inactive toggle, a "Skip next" button, an "Edit" button (opens `RecurringExpenseForm`), and a "Delete" button. A top-level "+ Add recurring" button opens the form for create.
- `RecurringExpenseForm.tsx` — modal: label, amount, frequency picker (Monthly / Weekly pills), next-due-date input, category picker. Save / Cancel.
- `RecurringAutoLogger.tsx` — top-level wrapper component. On mount, calls `runRecurringAutoLog()` exactly once, swallowing errors (logged via console; never crashes the app). Renders `children` unchanged. Lives in the expenses feature because the logic is expense-domain.

### Routes

- `src/app/expenses/quick-add.tsx` — thin: renders `<QuickAddScreen />`.
- `src/app/expenses/recurring.tsx` — thin: renders `<RecurringExpensesScreen />`.
- `src/app/_layout.tsx` — **modified** to wrap `<Stack>` with `<RecurringAutoLogger>`. The layout's role is provider/wrapper composition; the auto-log logic itself lives in the feature.

### Navigation

- `src/features/finance/expenses/TransactionsScreen.tsx` — **modified**. Beside the existing "+ Log Expense" CTA, add "Quick Add" and "Recurring" links that navigate to the two new routes. Layout: a two-row footer (top: secondary links; bottom: primary CTA).

## TDD Anchors

These are the failing tests to write first. Implementation is done when they all pass.

1. **`expenses.service.test.ts`** (extended): quick-add CRUD, recurring CRUD, auto-log, skip, and date math.
   - `createQuickAddTemplate` rejects empty label, zero/negative amount, and an unknown category id.
   - `getQuickAddTemplates` orders by `sort_order, id`.
   - `updateQuickAddTemplate(id, { amount: 700 })` mutates only the amount.
   - `deleteQuickAddTemplate` removes the row.
   - `logFromQuickAddTemplate` creates an expense whose category/amount match the template and whose date defaults to today.
   - `createRecurringExpense` rejects malformed `nextDueDate`, zero amount, unknown category, invalid frequency.
   - `getRecurringExpenses` orders by `next_due_date ASC, id`.
   - `setRecurringActive(id, false)` toggles the flag and survives a re-read.
   - `skipRecurringOccurrence` advances by one period and logs nothing; throws when the row is inactive.
   - `runRecurringAutoLog('2026-07-01')` with a row due `2026-07-01` logs one expense and advances `next_due_date` to `2026-08-01`; a second call on the same day logs zero.
   - `runRecurringAutoLog('2026-09-15')` with a row due `2026-07-01` logs three expenses (`2026-07-01`, `2026-08-01`, `2026-09-01`), advances to `2026-10-01`, all with `isRecurring: true`.
   - Inactive rows are ignored by auto-log even when due.
   - `advanceDueDate('2026-01-31', 'monthly')` returns `2026-02-28`; `advanceDueDate('2024-02-29', 'monthly')` returns `2024-03-29`; `advanceDueDate('2026-12-31', 'monthly')` returns `2027-01-31`; `advanceDueDate('2026-06-12', 'weekly')` returns `2026-06-19`.

2. **`QuickAddScreen.test.tsx`** — `src/features/finance/expenses/__tests__/QuickAddScreen.test.tsx`:
   - Renders a tile per template returned by the service.
   - Tapping a tile calls `logFromQuickAddTemplate` exactly once with that template's id.
   - The "+" tile opens the create modal; a successful save calls `createQuickAddTemplate` and refreshes the grid.
   - Long-pressing a tile opens the edit modal pre-filled with that template's fields.

3. **`RecurringExpensesScreen.test.tsx`**:
   - Renders one row per recurring entry with label, amount, next-due-date.
   - Toggling the active switch calls `setRecurringActive(id, …)` once.
   - Pressing "Skip next" calls `skipRecurringOccurrence` and the row's next-due-date updates after refresh.
   - "+ Add recurring" opens the create modal.

4. **`RecurringAutoLogger.test.tsx`**:
   - Calls `runRecurringAutoLog` exactly once on mount, then renders children.
   - When `runRecurringAutoLog` throws, children still render (no crash propagated).

## Acceptance Check (Done When)

- Opening the Transactions tab shows "Quick Add" and "Recurring" links plus the existing "+ Log Expense".
- Tap "Quick Add" → see a grid containing the templates I've added. Tap "Taxi 500" → it appears in the transaction list with today's date.
- Tap "Recurring" → see an empty state or my list. Add "Rent 150,000 — monthly — next 2026-07-01". When I re-open the app on `2026-07-01`, a "150,000 FCFA · Housing" expense is in the list dated `2026-07-01` and the recurring entry's next due date now reads `2026-08-01`.
- Long-press a Quick Add tile → edit / delete modal works.
- Toggle a recurring row to inactive → next open does not auto-log it; toggle it back on → next open after the due date does.
- Press "Skip next" on a recurring row → no new expense is logged, but its next-due-date moves forward by one period.
- `npm test` — all four new/extended test files pass; full suite remains green.

## Design Decisions (Locked During Grill Me)

- **Quick-add tiles do not navigate; they log instantly.** Rejected alt: a confirmation modal before logging. Why: the whole point of quick-add is one-tap; the user can swipe back through TransactionList to delete a misfire (a feature available post-VS-04). Friction is a regression here.

- **Frequency is a closed enum (`'monthly' | 'weekly'`) with a `CHECK` constraint, not a foreign-key into a frequencies table.** Same rationale as VS-05's `IncomeSource`: a small, closed set the UI doesn't let the user expand. CHECK guards against bad inserts at the DB layer; a runtime guard in the service rejects unknown strings before the SQLite error.

- **Auto-log writes the expense with `date = next_due_date`, not `date = today`.** Rejected alt: backfill all missed occurrences as "today". Why: the *budget month* for a missed payment is the month it was *due*, not the month the user happened to open the app. A rent payment due `2026-07-01` that auto-logs on `2026-09-15` belongs in July's allocation, not September's. This makes monthly reports honest.

- **`runRecurringAutoLog` loops per row, advancing until `next_due_date > today`.** Rejected alt: log only one occurrence per app open. Why: a user who skips the app for two months would otherwise lose a month of rent from their books, and a future open would *still* only log one. Replaying every missed occurrence is the only way to make the app's books match reality.

- **Each row's logged-expense + advance is wrapped in a transaction.** A crash between "insert expense" and "update next_due_date" would otherwise leave the row at the same date and re-log the same occurrence on next open. The transaction makes the pair atomic.

- **`skipRecurringOccurrence` throws when the row is inactive.** Rejected alt: silently advance the date anyway. Why: skipping an inactive row is meaningless (it wasn't going to log anyway) and almost certainly a UI mis-tap. Making it loud forces the user to re-activate first if they really meant to advance.

- **The auto-log runs in a wrapper component (`RecurringAutoLogger`) at app root, not from an effect inside an existing screen.** Rejected alt: piggyback the call on `TransactionsScreen`'s mount. Why: the user might land on Dashboard or Budget first; expenses still need to be current before those screens read the data. Root-level mount guarantees the work happens before any screen renders. `RecurringAutoLogger` is a feature component (not a layout concern), so the thin-layout rule isn't violated — the layout just composes it the way it composes `<Stack>`.

- **Auto-log errors are swallowed (logged to console) rather than surfaced as UI.** A failed SQLite call shouldn't gate the user's access to the app. The user can still log manually; the next open retries.

- **No "label" field on quick-add templates beyond user input.** The tile shows the user-defined label only; the underlying category isn't shown on the tile (it'd clutter at small sizes). The CategoryPicker is reused in the form so labels stay consistent with VS-04 naming.

- **Hard-delete (vs. archive) for both quick-add templates and recurring expenses.** The audit trail is the logged Expense rows, which carry `category_id` and `note` and survive template deletion. No referential constraint forces archiving.

- **Long-press on a quick-add tile is the documented edit affordance, with a "Delete" button inside the edit modal.** Rejected alt: a separate "Manage templates" route. Why: in-place edit is consistent with category management (long-press → manager), and adding a route would multiply navigation surface for a low-traffic action.

## Out of Scope (Deferred)

- Yearly or custom (`every N days`) frequencies → if needed, add another `frequency` enum entry plus a date-math branch.
- Reminder notifications for upcoming recurring due dates → VS-08 owns notification scheduling.
- "Edit this auto-logged expense" affordance on the Transactions list → no scope yet; the existing TransactionList renders auto-logged rows the same as manual ones.
- Quick-add templates with a default note → can be added with a single column + UI field later if real demand surfaces.
- Sharing one recurring entry across multiple accounts → the app is single-user.

## After This Slice

1. Run `/check-arch` to confirm no dependency-rule violations.
2. Invoke the `code-reviewer` subagent on the branch diff. Address any `BLOCK` findings.
3. Mark VS-07 as `✅ Done` in `docs/KANBAN.md` with the test count and migration numbers.
4. Delete `issues/ISSUE-007/` (or move it under `issues/done/`) per the doc-rot rule.
