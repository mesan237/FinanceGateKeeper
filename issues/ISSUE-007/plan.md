# ISSUE-007 — Implementation Plan (Phase 2)

Derived from `implementation-plan.md`. Maps every Scope bullet to concrete
files, in TDD write-order, with the design decisions made along the way.
Mirrors the VS-03 / VS-05 / VS-06 patterns (constants → types → migration →
service → hooks → UI → route, in-memory better-sqlite3 tests, screen tests
via RNTL).

**Blocker check:** VS-07 is blocked by VS-03 (✅ Done) per the KANBAN status
table. Categories, the expenses table, `createExpense`, and `CategoryPicker`
are all in place. Clear to proceed.

---

## File-by-file mapping

| #  | Scope bullet                       | File                                                                          | New/Mod |
|----|------------------------------------|-------------------------------------------------------------------------------|---------|
| 1  | Types (Frequency, templates, recurring) | `src/features/finance/expenses/expenses.types.ts`                        | Mod     |
| 2  | DB migration — quick_add_templates | `src/services/migrations/006_create_quick_add_templates_table.ts`             | New     |
| 3  | DB migration — recurring_expenses  | `src/services/migrations/007_create_recurring_expenses_table.ts`              | New     |
| 4  | Migration registry                 | `src/services/migrations/index.ts`                                            | Mod     |
| 5  | Service — date math + CRUD + auto-log | `src/features/finance/expenses/expenses.service.ts`                        | Mod     |
| 6  | Hooks — useQuickAdd, useRecurring  | `src/features/finance/expenses/expenses.hooks.ts`                             | Mod     |
| 7  | QuickAdd template form modal       | `src/features/finance/expenses/QuickAddTemplateForm.tsx`                      | New     |
| 8  | Quick Add screen                   | `src/features/finance/expenses/QuickAddScreen.tsx`                            | New     |
| 9  | Recurring expense form modal       | `src/features/finance/expenses/RecurringExpenseForm.tsx`                      | New     |
| 10 | Recurring expenses screen          | `src/features/finance/expenses/RecurringExpensesScreen.tsx`                   | New     |
| 11 | Auto-log wrapper                   | `src/features/finance/expenses/RecurringAutoLogger.tsx`                       | New     |
| 12 | Quick Add route                    | `src/app/expenses/quick-add.tsx`                                              | New     |
| 13 | Recurring route                    | `src/app/expenses/recurring.tsx`                                              | New     |
| 14 | Root layout (wrap Stack)           | `src/app/_layout.tsx`                                                         | Mod     |
| 15 | TransactionsScreen — nav links     | `src/features/finance/expenses/TransactionsScreen.tsx`                        | Mod     |

Test files (written **before** their implementation per Red-Green-Refactor):

- `src/features/finance/expenses/__tests__/expenses.service.test.ts` (extended with template + recurring + auto-log + date-math suites)
- `src/features/finance/expenses/__tests__/QuickAddScreen.test.tsx` (new)
- `src/features/finance/expenses/__tests__/RecurringExpensesScreen.test.tsx` (new)
- `src/features/finance/expenses/__tests__/RecurringAutoLogger.test.tsx` (new)
- `src/features/finance/expenses/__tests__/TransactionsScreen.test.tsx` (new or extended) — assert the two new nav links

---

## Write order (TDD)

1. **`expenses.types.ts`** — add `Frequency`, `QuickAddTemplate`, `NewQuickAddTemplate`, `RecurringExpense`, `NewRecurringExpense`. Pure TS; exercised by the service tests.
2. **Migrations 006 & 007** + register as ids 6, 7 in `migrations/index.ts`. Exercised end-to-end by the extended service test.
3. **Service — date math first.** RED: `advanceDueDate` cases in `expenses.service.test.ts`. GREEN: pure helper in `expenses.service.ts`. (No DB; cheap to write first.)
4. **Service — quick-add CRUD.** RED then GREEN.
5. **Service — recurring CRUD + active toggle.** RED then GREEN.
6. **Service — `skipRecurringOccurrence`.** RED then GREEN, including the "throws when inactive" path.
7. **Service — `runRecurringAutoLog`.** RED then GREEN, covering: single occurrence, multiple replay, idempotency, inactive filtering, transaction safety.
8. **Hooks** — extend `expenses.hooks.ts` with `useQuickAdd` and `useRecurring`. No standalone test file (the screen tests exercise them indirectly), matching how `useExpenseLog` is covered through `ExpenseLogScreen.test.tsx`.
9. **`QuickAddTemplateForm.tsx`** — modal form, no standalone test (covered through `QuickAddScreen.test.tsx`'s create / edit flows).
10. **`QuickAddScreen.tsx`** — RED: `QuickAddScreen.test.tsx`; GREEN: component.
11. **`RecurringExpenseForm.tsx`** — modal form, no standalone test.
12. **`RecurringExpensesScreen.tsx`** — RED: `RecurringExpensesScreen.test.tsx`; GREEN: component.
13. **`RecurringAutoLogger.tsx`** — RED: `RecurringAutoLogger.test.tsx`; GREEN: component.
14. **`TransactionsScreen.tsx`** — modify to add the two new nav links. RED: `TransactionsScreen.test.tsx` (new or extended) asserts the links + their navigation; GREEN: edit screen.
15. **Routes** — `src/app/expenses/quick-add.tsx`, `src/app/expenses/recurring.tsx`. Thin; no separate tests (matches `app/expenses/log.tsx`).
16. **Layout wrap** — `src/app/_layout.tsx` adds `<RecurringAutoLogger>` around `<Stack>`. No separate test (the wrapper itself is tested in step 13).

After all green: run `/check-arch` logic, then the `code-reviewer` subagent,
then flip KANBAN VS-07 → ✅ Done.

---

## Key implementation details

### Migration 006

```
CREATE TABLE IF NOT EXISTS quick_add_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  subcategory_id INTEGER REFERENCES categories(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
```

### Migration 007

```
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  subcategory_id INTEGER REFERENCES categories(id),
  frequency TEXT NOT NULL CHECK(frequency IN ('monthly','weekly')),
  next_due_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recurring_active_due
  ON recurring_expenses(is_active, next_due_date);
```

Index supports the auto-log query: `WHERE is_active = 1 AND next_due_date <= ?`.

### `advanceDueDate(iso, frequency)`

Pure, UTC-stable, no library:

```ts
const FREQUENCY_SET: ReadonlySet<string> = new Set(['monthly', 'weekly']);

export function advanceDueDate(iso: string, frequency: Frequency): string {
  if (frequency === 'weekly') {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 7);
    return toISODate(d);
  }
  // monthly: clamp day to target month's last day
  const [y, m, dd] = iso.split('-').map(Number);
  const targetMonth0 = m - 1 + 1;
  const targetYear = y + Math.floor(targetMonth0 / 12);
  const targetMonth = ((targetMonth0 % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clamped = Math.min(dd, lastDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}
```

### `runRecurringAutoLog(todayISO = toISODate(new Date()))`

```
SELECT * FROM recurring_expenses WHERE is_active = 1 AND next_due_date <= ?
```

For each row, in a loop while `next_due_date <= todayISO`:

1. `BEGIN TRANSACTION`
2. `INSERT INTO expenses (..., date = next_due_date, is_recurring = 1)`
3. `UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?` (new = `advanceDueDate(...)`)
4. `COMMIT`
5. set local `next_due_date` to the advanced value, re-check loop condition.

Returns `{ loggedCount }`. On any thrown error inside the loop, the
`catch` block runs `ROLLBACK` and re-throws — callers (only
`RecurringAutoLogger`) swallow.

### `RecurringAutoLogger`

```tsx
export function RecurringAutoLogger({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void runRecurringAutoLog().catch((e) => {
      console.error('Recurring auto-log failed:', e);
    });
  }, []);
  return <>{children}</>;
}
```

Effect deps `[]` — exactly once per app mount. The test mocks
`runRecurringAutoLog` and asserts the single call + children render path.

### `QuickAddScreen`

- `FlatList` with `numColumns={2}` over `templates`. Each cell is a `Pressable` with `onPress={() => log(template.id)}` and `onLongPress={() => openEdit(template)}`.
- The final cell is a `+` tile that calls `openCreate()`.
- A modal (`QuickAddTemplateForm`) is conditionally rendered based on a local state machine: `idle | create | edit(template)`.
- On a successful `log(id)`, show a short Toast-like footer ("Logged 500 FCFA · Taxi") that auto-dismisses after 2s. Implemented inline (no new dependency) with `setTimeout` + a local state flag.
- `testID` on each tile: `quick-add-tile-${template.id}`; the `+` tile: `quick-add-add-tile`.

### `RecurringExpensesScreen`

- `FlatList` over `recurring`. Each row: label + amount, next-due-date (short), frequency pill, `Switch`-style active toggle (Pressable rendering ON/OFF), "Skip next" button, "Edit" button, "Delete" button (confirms inline).
- Top button: "+ Add recurring" opens `RecurringExpenseForm`.
- `testID` per row: `recurring-row-${recurring.id}`.

### `expenses.hooks.ts` additions

Following the established pattern (mutations re-fetch, errors surface, no
optimistic UI):

```ts
export function useQuickAdd() {
  const [templates, setTemplates] = useState<QuickAddTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => { ... });
  useEffect(() => { void refresh(); }, [refresh]);
  const log = useCallback(async (id: number) => { ... }, []);
  const add = useCallback(async (input: NewQuickAddTemplate) => { ... }, [refresh]);
  const update = useCallback(async (id, patch) => { ... }, [refresh]);
  const remove = useCallback(async (id) => { ... }, [refresh]);
  return { templates, loading, error, refresh, log, add, update, remove };
}
```

`useRecurring` is the same shape with `setActive` and `skip` instead of
`log`.

### TransactionsScreen footer (modified)

```tsx
<View style={styles.fab}>
  <View style={styles.secondaryRow}>
    <Button label="Quick Add" onPress={() => router.push('/expenses/quick-add')} />
    <Button label="Recurring" onPress={() => router.push('/expenses/recurring')} />
  </View>
  <Button label="+ Log Expense" onPress={() => router.push('/expenses/log')} />
</View>
```

### Root layout (modified)

```tsx
import { Stack } from 'expo-router';
import React from 'react';
import { RecurringAutoLogger } from '@/features/finance/expenses/RecurringAutoLogger';

export default function RootLayout() {
  return (
    <RecurringAutoLogger>
      <Stack screenOptions={{ headerShown: false }} />
    </RecurringAutoLogger>
  );
}
```

This is the only feature import from `_layout.tsx`. Justified as
provider/wrapper composition (parallel to a Theme/Auth provider) rather than
business logic — the business logic itself is encapsulated inside the
feature component.

---

## Design decisions (and rejected alternatives)

**A. `Frequency` enum lives in `expenses.types.ts` directly (not in `constants/`).**
The `IncomeSource` and `Bucket` enums live in `constants/` because they are
also referenced from non-feature places (the source picker label map,
default percentages). `Frequency` is only ever referenced from the expenses
feature — putting it in constants would over-share. Rejected: hoisting to
`constants/frequencies.ts` (no consumer outside the slice).

**B. `runRecurringAutoLog` accepts an optional `todayISO` argument for testability.**
The default uses `toISODate(new Date())`. Tests pass an explicit string so
they don't depend on the system clock. Rejected: using `jest.setSystemTime`
exclusively (works, but the service contract is cleaner with an explicit
arg, and the production path remains a one-call code site).

**C. The auto-log loop wraps each row's "insert expense + advance date" in a transaction, not the whole call in one big transaction.**
Per-row atomicity is what we need: a crash between two rows shouldn't roll
back the rows that already advanced. Rejected: a single outer transaction
spanning all rows (would lose progress on partial failure).

**D. `RecurringAutoLogger` lives in `features/finance/expenses/` and is imported by `src/app/_layout.tsx`.**
The layout file is allowed to import feature components for provider/wrapper
composition (parallel to how `_layout.tsx` already imports `@/constants/colors`
for tab-bar chrome). The business logic — the SQL, the loop, the date
math — all lives in the feature service. The layout merely *composes* the
wrapper. Rejected: a hook (`useRecurringAutoLog`) called from inside an
existing screen — would either trigger on every focus or miss the case
where the user lands on Dashboard / Budget first.

**E. Auto-log errors are logged to `console.error`, not thrown.**
A failed migration or a temporary file lock shouldn't gate the user out of
the app. The user can still log manually; the next mount retries. Rejected:
surfacing an error banner (extra UI for a rare condition the user can do
nothing about).

**F. Quick-add tap shows a 2s in-screen toast, not a navigation away.**
The toast is implemented inline with `setTimeout`. Rejected: navigating to
the transactions list after each tap (high friction — defeats the whole
"one-tap" promise when the user wants to log five expenses in a row); a
third-party toast library (over-engineering).

**G. Long-press on a quick-add tile is the only edit affordance — no separate "Manage" button.**
Consistent with how VS-04 surfaces the category manager (long-press → edit
modal). Discoverable enough; documented in the screen's heading area
("long-press a tile to edit").

**H. Hard-delete templates and recurring rows; the logged-expense rows are the durable audit trail.**
The category column on each logged expense survives template deletion (it's
duplicated at log time, not joined). Rejected: an `is_archived` flag and
soft delete (extra column, extra UI state, no win — the user never wants to
"recover" a quick-add template; they re-create it).

**I. The "skip" button on a recurring row throws when the row is inactive.**
A loud error forces the user to re-activate first if they really meant to
advance. Rejected: silently advancing the date (almost certainly a UI
mis-tap; the surprise on next mount would be worse than a one-line error).

**J. The `+` tile in the Quick Add grid is rendered as the *last* item, not the first.**
Tap targets the user uses every day stay at the top-left where their thumb
is. The create button is intentionally a slightly slower reach. Rejected:
floating `+` button (covers a tile at small grid sizes).
