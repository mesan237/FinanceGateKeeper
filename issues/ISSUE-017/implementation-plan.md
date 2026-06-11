# ISSUE-017 — Expense Edit & Delete

**Maps to:** KANBAN VS-17
**Priority:** High
**Blocked by:** VS-16 Transaction UX Enhancement (✅)

---

## Scope Decisions (settled before drafting)

**1. No new migration.**
The `expenses` table already has all the columns needed for editing (`amount`, `category_id`,
`subcategory_id`, `note`, `date`). VS-17 adds service functions that `UPDATE` and `DELETE` existing rows —
no schema change required.

**2. `useExpenseEdit` is a new hook, distinct from `useExpenseLog`.**
`useExpenseLog` is stateless by design — it initialises from nothing and resets to a clean slate after
submit. `useExpenseEdit(id)` must load existing data on mount and expose update/delete handlers that map
back to the database record. Merging them into one hook would complicate both call sites. The new hook
lives in `expenses.hooks.ts` alongside the others.

**3. `ExpenseDetailScreen` mirrors `ExpenseLogScreen` in layout but is NOT a refactor of it.**
The two forms share visual structure but different data flow: log starts blank, detail starts pre-filled.
Extracting a shared form component is an abstraction that goes beyond VS-17 scope. `ExpenseDetailScreen`
is its own component with its own state.

**4. Over-budget check runs on save only when the amount changed.**
The check is triggered by a monetary delta — re-saving with the same amount should not produce a false
overage. Compare the new amount against the original loaded amount before calling `useOverBudgetCheck`.

**5. `ExpenseDetailRoute` follows the `DebtDetailRoute` / `ProjectDetailRoute` pattern exactly.**
It lives in the expenses feature folder, reads `useLocalSearchParams`, validates the id, and renders
`<ExpenseDetailScreen expenseId={id}>`. The thin route at `app/expenses/[id].tsx` renders nothing but
`<ExpenseDetailRoute />`.

**6. Income rows in `TransactionList` remain non-tappable.**
Income edit/delete requires reversing a budget allocation — that is out of scope for this slice and
deferred to a future issue. Expense rows gain `onPress`; income rows do not.

**7. No edit UI for `isRecurring` flag.**
The detail screen lets the user fix the amount, category, note, and date. The `isRecurring` flag reflects
how the expense was originally created and should not be surfaced for ad-hoc edits. It is preserved as-is
by `updateExpense`.

---

## Problem Statement

Expenses logged in error — wrong amount, wrong category, wrong date — have no correction path.
`TransactionList` rows are non-tappable. There is no `updateExpense` or `deleteExpense` in the service.
This forces users to log a compensating entry or live with the mistake.

VS-17 closes this gap: expense rows become tappable, opening a pre-filled edit form. The user can correct
any field and save, or delete the expense with a one-step confirmation. The over-budget guard re-runs if
the amount increases.

---

## User Stories

- **As the user,** I can tap any expense row in the Transactions tab to open a pre-filled edit form.
- **As the user,** I can correct the amount, category, subcategory, note, or date and save the change.
- **As the user,** saving a higher amount re-runs the over-budget check and shows the alert if needed.
- **As the user,** I can delete an expense from the edit form with a single confirmation modal.
- **As the user,** income rows in the feed are not tappable — I am not confused about whether I can
  edit them.
- **As the user,** the edit form has a Cancel header button so I can leave without making changes.

---

## Scope

Files are listed in TDD order — tests before implementation, foundations before consumers.

---

### 1. Service — `src/features/finance/expenses/expenses.service.ts` (modified)

Add two new exported functions at the bottom of the file. Both throw if the given id does not exist.

```ts
/**
 * Updates mutable fields on an expense. Throws if no row exists for `id`.
 * Fields not included in `fields` are left unchanged (partial UPDATE).
 */
export async function updateExpense(
  id: number,
  fields: Partial<Pick<Expense, 'amount' | 'categoryId' | 'subcategoryId' | 'note' | 'date'>>,
): Promise<void>

/**
 * Deletes an expense by id. Throws if no row exists for `id`.
 */
export async function deleteExpense(id: number): Promise<void>
```

**Implementation notes:**

- `updateExpense`: build a dynamic `SET` clause from the keys present in `fields`. Map camelCase keys to
  their snake_case column names (`categoryId → category_id`, `subcategoryId → subcategory_id`). If
  `amount` is in `fields`, validate it is a positive integer (same guard as `createExpense`). After the
  `UPDATE`, confirm `changes > 0`; if not, throw `'Expense not found.'`.
- `deleteExpense`: `DELETE FROM expenses WHERE id = ?`. Confirm `changes > 0`; if not, throw
  `'Expense not found.'`.
- Both functions live entirely in `expenses.service.ts`. No new file.
- The service already imports `execute` and `query` from `@/services/database` — no new imports needed.

---

### 2. Service — also add `getExpenseById`

The detail hook needs to load a single expense by id on mount.

```ts
/**
 * Returns a single expense by id, or null if not found.
 */
export async function getExpenseById(id: number): Promise<Expense | null>
```

Uses `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE id = ? LIMIT 1` and maps via `mapExpense`. Returns
`null` for a missing row (not a throw — the UI handles the not-found case visually).

---

### 3. Hook — `src/features/finance/expenses/expenses.hooks.ts` (modified)

Add `useExpenseEdit` at the bottom of the file.

```ts
/**
 * Loads an expense by id on mount, exposes field setters pre-filled with the
 * loaded values, and provides `update` (persist changed fields) and `remove`
 * (delete with navigation handled by the caller). Re-fetches after a successful
 * update so callers that stay mounted see fresh data.
 */
export function useExpenseEdit(id: number): {
  // loaded values
  amount: string;
  setAmount: (v: string) => void;
  categoryId: number | null;
  setCategoryId: (v: number | null) => void;
  subcategoryId: number | null;
  setSubcategoryId: (v: number | null) => void;
  note: string;
  setNote: (v: string) => void;
  date: string;
  setDate: (v: string) => void;

  originalAmount: number | null;   // FCFA integer; used by caller to detect amount change
  canSubmit: boolean;              // true when amount > 0 and categoryId is set
  loading: boolean;
  error: string | null;

  update: () => Promise<boolean>;  // returns true on success, false on error
  remove: () => Promise<boolean>;  // returns true on success, false on error
}
```

**Behaviour:**

- On mount: call `getExpenseById(id)`. If found, initialise all field states from the loaded expense
  (amount as string, note as empty string if null). Store the original `amount` integer in
  `originalAmount` state. If not found, set `error = 'Expense not found.'`.
- `update()`: reads current field state, calls `updateExpense(id, { ... })` with only the changed fields
  (compare against the loaded originals). On success, re-fetches via `getExpenseById` and returns `true`.
  On error, sets `error` and returns `false`.
- `remove()`: calls `deleteExpense(id)`. On success returns `true`. On error, sets `error` and returns
  `false`.
- `canSubmit`: `Number.isFinite(numericAmount) && numericAmount > 0 && categoryId !== null`.

---

### 4. Screen — `src/features/finance/expenses/ExpenseDetailScreen.tsx` (new)

```tsx
export interface ExpenseDetailScreenProps {
  expenseId: number;
}
```

Layout mirrors `ExpenseLogScreen` with these differences:

- `ScreenHeader title="Edit Expense" cancelLabel="Cancel"` (cancel navigates back without saving).
- All fields initialised from `useExpenseEdit(expenseId)`.
- Save button calls `handleSave` (see below). Disabled when `!edit.canSubmit`.
- A "Delete expense" danger button below the form opens a confirmation `Modal`.
  - Modal text: `"Delete this expense? This cannot be undone."`
  - Two buttons: `"Cancel"` (closes modal) and `"Delete"` (calls `edit.remove()`, on success calls
    `router.back()`).
- `router.back()` on successful save.

**Over-budget check on save:**

```ts
const handleSave = async () => {
  const newAmount = Math.trunc(Number(edit.amount));
  const amountChanged = edit.originalAmount !== null && newAmount !== edit.originalAmount;
  if (amountChanged && newAmount > (edit.originalAmount ?? 0)) {
    // amount increased — run the check against the delta
    const result = await check(newAmount);
    if (result.isOver) {
      setOverage(result.overage);
      return;
    }
  }
  const ok = await edit.update();
  if (ok) router.back();
};
```

The check uses `useOverBudgetCheck` (same import path as `ExpenseLogScreen`). The screen manages
`overage` state for the `OverBudgetAlert` modal, identical to `ExpenseLogScreen`.

**Imports:**
- `@/components/Button`, `@/components/Modal`, `@/components/ScreenHeader`, `@/components/TextInput`,
  `@/components/Typography`
- `@/features/finance/budget/OverBudgetAlert`, `@/features/finance/budget/budget.hooks`
  (existing approved `expenses → budget` edge)
- `./CategoryPicker`, `./expenses.hooks`
- `expo-router` (`useRouter`)

**File length:** this screen is about 130 lines — well under the 300-line cap.

---

### 5. Route wrapper — `src/features/finance/expenses/ExpenseDetailRoute.tsx` (new)

```tsx
/**
 * Reads `id` from the route's search params, validates it, and renders
 * `<ExpenseDetailScreen>`. Mirrors `DebtDetailRoute` and `ProjectDetailRoute`.
 */
export function ExpenseDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;

  if (!valid) {
    return (
      <View style={styles.container}>
        <Typography variant="muted">Invalid expense id.</Typography>
      </View>
    );
  }

  return <ExpenseDetailScreen expenseId={id} />;
}
```

---

### 6. Route — `src/app/expenses/[id].tsx` (new)

```tsx
import { ExpenseDetailRoute } from '@/features/finance/expenses/ExpenseDetailRoute';

export default function ExpenseDetailScreenRoute() {
  return <ExpenseDetailRoute />;
}
```

Thin route, consistent with `src/app/debt/[id].tsx`.

---

### 7. Transaction list — `src/features/finance/expenses/TransactionList.tsx` (modified)

Expense rows gain an `onPress`:

```tsx
// before (income row — unchanged)
<View testID={`tx-row-income-${item.id}`} style={[styles.row, styles.rowIncomeBorder]}>

// after (expense row — add Pressable wrapper)
<Pressable
  testID={`tx-row-expense-${item.id}`}
  onPress={() => router.push(`/expenses/${item.id}`)}
  style={[styles.row, styles.rowExpenseBorder]}
>
  ...
</Pressable>
```

Income rows remain a plain `<View>` with no `onPress`. The `router` comes from `useRouter()` imported
from `expo-router` (already available in the React Native feature layer via Expo Router).

This is a minimal, surgical change — only the `renderItem` branch for expense rows changes.

---

## TDD Anchors

All tests written **failing first** before implementation.

---

### `expenses.service.test.ts` additions

In the existing in-memory SQLite test file:

1. `updateExpense` — persists changed `amount`; re-fetching the row returns the new value.
2. `updateExpense` — persists changed `categoryId`; other fields unchanged.
3. `updateExpense` — persists changed `note` (including `null`).
4. `updateExpense` — persists changed `date`.
5. `updateExpense` — throws for a non-existent id.
6. `updateExpense` — throws when `amount` in patch is not a positive integer.
7. `deleteExpense` — removes the row; subsequent `getExpenseById(id)` returns `null`.
8. `deleteExpense` — throws for a non-existent id.
9. `getExpenseById` — returns the expense for a known id.
10. `getExpenseById` — returns `null` for an unknown id.

---

### `expenses.hooks.test.ts` additions

In the existing hook test file (mock service or use the same in-memory DB pattern):

1. `useExpenseEdit` — loads expense data on mount; field values match the stored row.
2. `useExpenseEdit` — `update()` calls `updateExpense` with changed fields and returns `true`.
3. `useExpenseEdit` — `remove()` calls `deleteExpense` and returns `true`.
4. `useExpenseEdit` — `error` is set when the expense id does not exist.
5. `useExpenseEdit` — `canSubmit` is `false` when amount is empty or categoryId is null.

---

### `ExpenseDetailScreen.test.tsx` (new)

Using React Native Testing Library + in-memory DB (consistent with the other screen tests in this slice):

1. Renders with pre-filled amount, category label, note, and date fields.
2. Save button is disabled when amount is cleared.
3. Save button calls `updateExpense` with changed fields; navigates back on success.
4. Delete button opens a confirmation modal showing the confirmation message.
5. Confirming deletion calls `deleteExpense` and navigates back.
6. Cancelling the deletion modal closes it without calling `deleteExpense`.
7. Over-budget alert is shown when the updated amount exceeds the budget (amount increased).
8. Over-budget alert is not shown when the amount is unchanged.

---

### `ExpenseDetailRoute.test.tsx` (new)

1. Renders error state for `id = 0`.
2. Renders error state for `id = NaN` (non-numeric param).
3. Renders `ExpenseDetailScreen` for a valid positive integer id.

---

### `TransactionList.test.tsx` additions

1. Expense rows are tappable — `fireEvent.press` on an expense row calls `router.push` with the correct
   path `/expenses/<id>`.
2. Income rows are not tappable — they render a `View`, not a `Pressable`; pressing does nothing.

---

## Acceptance Check (Done When)

- Tapping an expense row in the Transactions tab opens a pre-filled edit form with a Cancel header button.
- Any field (amount, category, subcategory, note, date) can be changed and saved.
- Saving a higher amount that exceeds the monthly budget shows the over-budget alert; the user can
  proceed or cancel.
- Saving with an unchanged or lower amount skips the budget check.
- A "Delete expense" button opens a confirmation modal. Confirming deletes the row and navigates back.
  Cancelling closes the modal; the expense is unchanged.
- Income rows in the Transactions tab are not tappable.
- `npm test` — new and updated tests all pass; full suite stays green.
- `/check-arch` clean — no new cross-feature edges; `expenses → budget` remains the only approved
  cross-feature import in this slice; `ExpenseDetailRoute` lives in the feature folder (no `expo-router`
  import in `app/` beyond the thin route).

---

## Design Decisions

1. **`useExpenseEdit` is separate from `useExpenseLog`.** Log starts blank; edit starts from a fetched
   row. Merging them would require conditionally defaulting every field — more complexity for no real
   gain.

2. **Over-budget check only on amount increase.** Decreasing or keeping the same amount cannot push the
   budget further over. Running the check unconditionally would produce spurious alerts when the user
   is already over budget and is trying to correct an entry.

3. **Pressable wraps the entire expense row.** The whole row is the tap target, matching the touch
   affordance users expect. Income rows remain `View` — making them `Pressable disabled` is subtly
   confusing; plain `View` communicates non-interactivity cleanly.

4. **`router.push` (not `router.navigate`).** Detail screens should stack on top of the current tab so
   the user can navigate back to the exact list state they left. `push` ensures the back button on
   `ExpenseDetailScreen` returns to the transaction list.

5. **No shared form component.** Log and detail share visual structure but diverge on data flow and
   submit semantics. Extracting a shared form would add an abstraction layer for two callsites —
   below the threshold where abstraction pays off.

---

## Out of Scope (Not in VS-17)

- Income edit/delete — requires reversing a budget allocation; dedicated future slice.
- Bulk delete.
- Restoring deleted expenses (no soft-delete).
- Editing the `isRecurring` flag from the detail screen.
- Subcategory-level icons on the edit form (inherited from VS-16's unchanged `CategoryPicker`).
