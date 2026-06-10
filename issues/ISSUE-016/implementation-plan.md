# ISSUE-016 — Transaction UX Enhancement

**Maps to:** KANBAN VS-16
**Priority:** High
**Blocked by:** VS-03 Expense Logging (✅), VS-05 Income Logging (✅), VS-08 Daily Reminder & Modes (✅)

---

## Scope Decisions (settled before drafting)

**1. Migration number is 016, not 015.**
Migration 015 is already occupied by `015_dedupe_categories.ts` (added during VS-07 to heal a seeding
bug). The KANBAN draft pre-dates that migration. The action_bar_style column lands in `016`.

**2. `expenses → auth` cross-feature edge is NOT introduced.**
The KANBAN describes `TransactionsScreen` reading `useActionBarStyle()` from `auth.hooks.ts`. That would
require approving `expenses → auth`, which is not on the table and contradicts the routing-layer gating
precedent established by VS-08 (app-mode gating lives at the route, not inside a feature screen). Instead:
`app/(tabs)/transactions.tsx` calls `useActionBarStyle()` (routes may import any feature) and passes a
plain `actionBarStyle: ActionBarStyle` prop to `TransactionsScreen`. The same prop-drilling pattern as
`includeBudgetData` on the Dashboard. No new cross-feature edge is added.

**3. `services/transactions.ts` lives in shared `services/`, not inside a feature.**
The unified feed JOINs `expenses` and `income` — two tables owned by two different features. Placing this
query in `expenses.service.ts` would create an implicit `expenses → income` edge. Placing it in
`income.service.ts` is equally wrong. Shared infrastructure is the correct home; `services/` can read any
table and is already the layer features depend on. `TransactionList` reaches this via the updated
`useTransactions` hook, which calls `services/transactions.ts` instead of `expenses.service.ts`.

**4. `types/transactions.ts` lives in shared `types/`.**
`TransactionEntry` is consumed by `services/transactions.ts` and `TransactionList.tsx` (expenses feature).
Placing the type in either feature would require the other to import across feature boundaries. The shared
`types/` folder is already the home for cross-cutting types.

**5. `expenses.hooks.ts` — `useTransactions` is updated in place.**
The hook's existing callers (only `TransactionList`) shift to the new signature. No second hook is
introduced. Existing `TransactionFilter` stays on the type for intra-month category filtering; the
`from`/`to` date filter fields are retired (month scoping replaces them).

**6. Income rows in the feed are read-only (non-tappable).**
VS-16 does not add income edit/delete. Income rows render with no `onPress`. Tappable expense rows
(pressing opens `ExpenseDetailScreen`) land in VS-17, which explicitly blocks on VS-16.

---

## Problem Statement

The Transactions tab shows only expenses, using a flat `FlatList` with no date grouping and no income
entries. The tab has no way to navigate to Settings — a gear icon was hardcoded as a compact FAB button.
Pushed screens (forms, detail views) have no back buttons. The action bar includes Recurring, Debts, and
Settings shortcuts that do not belong on the Transactions tab. There are no icons on category rows or
quick-add tiles.

VS-16 closes all of these gaps in one slice: unified income+expense feed, SectionList date grouping,
month navigation, FAB rationalization, category icons throughout, gear icons in every tab header, a
reusable `ScreenHeader` for all pushed screens, and an action bar style preference.

---

## User Stories

- **As the user,** the Transactions tab shows my income and expenses together, grouped by day with a
  section header showing the day's net total, scoped to the current calendar month.
- **As the user,** I can tap the prev/next arrows to browse past months.
- **As the user,** income rows show a green left border and expense rows a muted one, each with a
  category/source icon beside the label.
- **As the user,** the action bar on the Transactions tab shows Quick Add and Log Expense only — Log
  Income stays on the Dashboard where the budget impact is immediately visible.
- **As the user,** I can switch the action bar to "Speed dial" mode in Settings, which collapses the
  two buttons into a single "+" FAB that expands.
- **As the user,** every form screen shows a "Cancel" button, and every detail/list screen shows a
  back chevron — so I can always navigate back without hunting.
- **As the user,** a gear icon in every tab's header takes me straight to Settings.
- **As the user,** Quick Add tiles and the Category Picker show Ionicons icons beside labels so I can
  find the right category at a glance.

---

## Scope

Files are listed in TDD order — tests before implementation, shared foundations before consumers.

---

### 1. Types — `src/types/transactions.ts` (new)

```ts
export interface ExpenseEntry {
  type: 'expense';
  id: number;
  amount: number;
  date: string;          // YYYY-MM-DD
  categoryId: number;
  categoryLabel: string; // resolved from JOIN
  subcategoryId: number | null;
  subcategoryLabel: string | null;
  note: string | null;
}

export interface IncomeEntry {
  type: 'income';
  id: number;
  amount: number;
  date: string;          // YYYY-MM-DD
  source: string;        // 'salary' | 'freelance' | 'ecommerce'
  sourceLabel: string;   // human-readable: "Salary", "Freelance", "E-commerce"
  note: string | null;
}

export type TransactionEntry = ExpenseEntry | IncomeEntry;
```

No logic; no imports from features.

---

### 2. Service — `src/services/transactions.ts` (new)

```ts
getTransactionFeed(monthISO: string): Promise<TransactionEntry[]>
```

- Executes one SQL query: `UNION ALL` of `expenses JOIN categories` (for label) and `income`, both
  filtered to the given month, `ORDER BY date DESC, id DESC` (newest first, stable tie-break on id).
- `monthISO` format: `YYYY-MM`. Filter: `date LIKE 'YYYY-MM-%'`.
- `sourceLabel` mapping for income (`'salary' → 'Salary'`, etc.) happens in the query or in JS — either
  is fine; prefer a small lookup object in the service file to keep the SQL readable.
- Returns `[]` for a month with no data. No error swallowing — throws on DB error.
- **No imports from `features/`.** Uses `db.query` from `@/services/database`.

---

### 3. Component — `src/components/ScreenHeader.tsx` (new)

```tsx
interface ScreenHeaderProps {
  title: string;
  cancelLabel?: string;   // renders "Cancel" text instead of the back chevron
  rightAction?: React.ReactNode;
}
```

- Renders: `[chevron-back / cancelLabel text]  [title]  [rightAction?]`.
- Back/cancel taps call `router.back()`.
- Uses `Typography` for the title, `Ionicons` (`chevron-back`) for the icon, shared color tokens.
- `testID`s: `screen-header-back`, `screen-header-title`, `screen-header-right`.

---

### 4. Constants — `src/constants/categoryIcons.ts` (new)

```ts
// maps default category id → Ionicons name
export const CATEGORY_ICON_MAP: Record<number, string> = { ... };

// maps income source → Ionicons name
export const INCOME_SOURCE_ICON_MAP: Record<string, string> = {
  salary:     'briefcase-outline',
  freelance:  'laptop-outline',
  ecommerce:  'storefront-outline',
};

/** Returns the Ionicons icon name, or null for unknown ids (→ fallback avatar). */
export function getTransactionIcon(
  type: 'expense' | 'income',
  categoryId?: number,
  source?: string,
): string | null

/** Returns { color: string; letter: string } for custom categories with no mapped icon. */
export function getCategoryAvatar(name: string): { color: string; letter: string }
```

Default icon mapping (from KANBAN):

| Category      | Icon                          |
| ------------- | ----------------------------- |
| Food / Drink  | `restaurant-outline`          |
| Transport     | `car-outline`                 |
| Bills         | `receipt-outline`             |
| Health        | `medkit-outline`              |
| Entertainment | `film-outline`                |
| Education     | `book-outline`                |
| Shopping      | `bag-outline`                 |
| Housing       | `home-outline`                |
| Communication | `call-outline`                |
| Gifts & Help  | `gift-outline`                |
| Other         | `ellipsis-horizontal-outline` |

`getCategoryAvatar` deterministically picks a background color from a small palette using `name.length % palette.length`, returns the first letter of name uppercased.

Default category ids are known at seed time. The constants file imports the `DEFAULT_CATEGORIES` list from
`@/constants/categories` to build the id→icon map at module load, so it stays in sync if seeds ever
change.

---

### 5. Migration — `src/services/migrations/016_add_action_bar_style.ts` (new)

```sql
-- up
ALTER TABLE users ADD COLUMN action_bar_style TEXT NOT NULL DEFAULT 'explicit';
-- down: SQLite has no DROP COLUMN before 3.35; the down stub is a no-op with a comment explaining this.
```

Migration id: `16`, name: `'016_add_action_bar_style'`. Register in `migrations/index.ts`.

---

### 6. Auth types — `src/features/finance/auth/auth.types.ts` (modified)

Add:

```ts
export type ActionBarStyle = 'explicit' | 'speed_dial';
```

---

### 7. Auth service — `src/features/finance/auth/auth.service.ts` (modified)

Add two functions (no new table — reads/writes the `users` table via migration 016):

```ts
getActionBarStyle(): Promise<ActionBarStyle>
setActionBarStyle(style: ActionBarStyle): Promise<void>
```

- `getActionBarStyle` returns `'explicit'` if no row exists yet (first launch before any user row).
- `setActionBarStyle` throws if `style` is not `'explicit'` or `'speed_dial'`.

---

### 8. Auth hooks — `src/features/finance/auth/auth.hooks.ts` (modified)

Add:

```ts
useActionBarStyle(): { style: ActionBarStyle; setStyle: (s: ActionBarStyle) => Promise<void>; loading: boolean }
```

---

### 9. Settings screen — `src/features/finance/auth/SettingsScreen.tsx` (modified)

Add a new "Action bar style" section below the notification toggle:

- Two tappable option rows: **Explicit buttons** (default) and **Speed dial**.
- Active option has a checkmark or highlight.
- Selecting calls `setStyle` from `useActionBarStyle()`.
- No reload/restart needed — `TransactionsScreen` reads the style via its prop, which re-renders when the
  hook value changes.

---

### 10. Expenses hooks — `src/features/finance/expenses/expenses.hooks.ts` (modified)

Update `useTransactions`:

```ts
// before
useTransactions(filter?: TransactionFilter): { expenses, loading, error, refresh }

// after
useTransactions(monthISO: string, filter?: Pick<TransactionFilter, 'categoryId'>):
  { entries: TransactionEntry[]; loading: boolean; error: string | null; refresh: () => void }
```

- Calls `getTransactionFeed(monthISO)` from `@/services/transactions`.
- `categoryId` filter applies client-side (filter entries where `entry.type === 'expense' &&
  entry.categoryId === filter.categoryId`). Income entries are never filtered out by the category chip —
  they always appear regardless of which category chip is active. If this behaviour is surprising, note
  it explicitly; it matches the spec which says "category chip filter applies within the selected month"
  but only expense rows have a category.
- `monthISO` defaults to nothing — callers supply it. `TransactionList` passes the current month and
  updates it on prev/next navigation.
- **Removes** the old `expenses` return field; replaces with `entries: TransactionEntry[]`.

---

### 11. Transaction list — `src/features/finance/expenses/TransactionList.tsx` (rewrite)

**SectionList structure:**

- Sections keyed by `YYYY-MM-DD` ISO date string, sorted newest first.
- Section header (`renderSectionHeader`):
  - Left: formatted date label — "Today", "Yesterday", or `"Mon 9 Jun"` (short weekday + day + short month). Use `formatDate` from `@/utils/formatDate`.
  - Right: day net total = sum(expense amounts) − sum(income amounts) for that day. Display with `formatCurrency`. Positive = net spend (expenses > income), negative = net income surplus.
- Rows (`renderItem`):
  - Colored left border (3px): `SUCCESS` green for `type === 'income'`; `TEXT_MUTED` tinted for `type === 'expense'`.
  - Icon (22 × 22 `Ionicons`): from `getTransactionIcon`; fallback to `getCategoryAvatar` letter-avatar in a small rounded square if `null`.
  - Label: `categoryLabel` / `subcategoryLabel` for expenses; `sourceLabel` for income.
  - Amount right-aligned: green text for income, default text for expense.
  - Date column removed (it lives in the section header now).
  - Income rows: no `onPress` (non-tappable in VS-16; tappable expense rows are VS-17).

**Month navigation header (rendered above the SectionList):**

- Prev arrow (`chevron-back`) / current month label (e.g. "June 2026") / Next arrow (`chevron-forward`).
- Next arrow disabled when `monthISO` equals the current calendar month (can't browse into the future).
- Category chip row stays below the month nav, unchanged in structure; category chips filter only expense rows.

**Empty state:** "No transactions in [Month YYYY]."

**State owned by `TransactionList`:**
- `monthISO` (default: `currentMonthISO()` from `@/utils/formatDate`)
- `selectedCategoryId` (null = all)

Passes `monthISO` + `selectedCategoryId` to `useTransactions`.

---

### 12. Transactions screen — `src/features/finance/expenses/TransactionsScreen.tsx` (modified)

**New prop:**

```tsx
interface TransactionsScreenProps {
  actionBarStyle: ActionBarStyle;
}
```

**FAB rationalization:**

- Remove: Recurring button, Debts button, Settings button, Log Income button.
- Retain: Quick Add (compact secondary) + Log Expense (primary).
- `explicit` style: both buttons always visible side by side.
- `speed_dial` style: single `+` FAB; on press, expands to two labelled rows (Log Expense, Quick Add)
  using an animated overlay or a simple Modal. Keep it simple — a `Modal` with two large buttons is
  sufficient; no complex spring animation.

**Remove** the `paddingBottom: 140` comment and tighten the list's bottom padding to match the new
shorter FAB (two buttons ≈ 80px; keep 90px with breathing room).

---

### 13. Transactions route — `src/app/(tabs)/transactions.tsx` (modified)

```tsx
import { useActionBarStyle } from '@/features/finance/auth/auth.hooks';
import { TransactionsScreen } from '@/features/finance/expenses/TransactionsScreen';

export default function TransactionsRoute() {
  const { style } = useActionBarStyle();
  return <TransactionsScreen actionBarStyle={style} />;
}
```

This keeps the cross-feature read at the routing layer. No `expenses → auth` import inside the feature.

---

### 14. Tab layout — `src/app/(tabs)/_layout.tsx` (modified)

- Set `headerShown: true` on each tab `<Tabs.Screen>`.
- Add `headerRight` to every tab: a gear `Ionicons` icon (`settings-outline`, 22px) that calls
  `router.push('/settings')`.
- The tab bar itself is unchanged.
- Remove the "Settings" compact button from `TransactionsScreen`'s FAB (handled in step 12 above).

---

### 15. ScreenHeader rollout — multiple files (modified)

Apply `<ScreenHeader>` as the first element inside the screen component (replacing whatever ad-hoc
headers exist, if any). Routes that render these screens do not need changes — the header is inside the
component, not a navigator option.

**Form screens (use `cancelLabel="Cancel"`):**
- `ExpenseLogScreen.tsx` — `title="Log Expense"`
- `src/app/income/log.tsx` → the screen it renders (`IncomeLogScreen.tsx`) — `title="Log Income"`
- `DebtForm.tsx` (rendered by `/debt/create`) — `title="New Debt"`
- `ProjectForm.tsx` (rendered by `/projects/create`) — `title="New Project"`

**Detail / list screens (use default back chevron):**
- `QuickAddScreen.tsx` — `title="Quick Add"`
- `RecurringExpensesScreen.tsx` — `title="Recurring"`
- `CategoryManager.tsx` (rendered by `/expenses/categories`) — `title="Categories"`
- `AllocationScreen.tsx` / `AllocationSettings.tsx` — confirm which screen `/income/allocate` and
  `/budget/settings` render, then add ScreenHeader with appropriate titles.
- `SettingsScreen.tsx` (rendered by `/settings`) — `title="Settings"`.
- `DebtDetail.tsx` — `title="Debt Detail"`.
- `ProjectDetail.tsx` — `title="Project"`.
- `FundDetail.tsx` — `title="Fund"`.
- `src/app/funds/index.tsx` → the screen it renders — `title="Funds"`.

Check each file before editing: if a screen already renders its own title bar, replace it; if it uses
a Stack navigator `<Stack.Screen options={{ title: ... }}>` from the route file, that navigator option
takes precedence and ScreenHeader should be omitted from the component (navigator header is sufficient).
Expo Router's `Stack` auto-generates a back button when screens are pushed — confirm whether existing
pushed screens already get a navigator back button and whether `ScreenHeader` is still needed or is
redundant. If the Stack navigator already provides back navigation, `ScreenHeader` adds a second header;
in that case the correct fix is to set `headerShown: false` on the Stack screen and let `ScreenHeader`
own the header. Resolve this per screen in the implementation pass.

---

### 16. QuickAddScreen icons — `src/features/finance/expenses/QuickAddScreen.tsx` (modified)

- Each template tile renders `getTransactionIcon('expense', template.categoryId)` as an `Ionicons` icon
  (28px) above the label, or a `getCategoryAvatar` letter-square if the icon is `null`.
- Tile layout shift: icon → label → amount (vertically stacked), center-aligned.

---

### 17. CategoryPicker icons — `src/features/finance/expenses/CategoryPicker.tsx` (modified)

- Each parent row and each subcategory row shows a 20px `Ionicons` icon (or letter-avatar) to the left
  of the name.
- Padding adjusted so icon + text alignment is tight.

---

## TDD Anchors

All tests are written **failing first** before implementation.

### `transactions.service.test.ts` (new, in-memory SQLite)

1. Feed returns income and expense rows merged, newest-first (`date DESC, id DESC`).
2. Expense rows carry `type: 'expense'`; income rows carry `type: 'income'`.
3. Each expense row has `categoryLabel` resolved from the categories JOIN.
4. Rows are scoped to the given `monthISO`; rows from other months are excluded.
5. Returns `[]` for a month with no data.
6. Income `sourceLabel` is the human-readable string (`'salary'` → `'Salary'`).

### `ScreenHeader.test.tsx` (new)

1. Renders back chevron icon and title text.
2. Pressing back chevron calls `router.back()`.
3. Renders `cancelLabel` string instead of the chevron when the prop is provided.
4. Renders `rightAction` node when provided.

### `categoryIcons.test.ts` (new)

1. `getTransactionIcon('expense', <known default id>)` returns the expected Ionicons name.
2. `getTransactionIcon('income', undefined, 'salary')` returns `'briefcase-outline'`.
3. `getTransactionIcon('expense', 99999)` returns `null` (unknown id → fallback).
4. `getCategoryAvatar('Food')` returns `{ color: string; letter: 'F' }`.
5. Two different names in the same palette slot (by length) get the same color — deterministic.

### `auth.service.test.ts` additions

1. `getActionBarStyle` returns `'explicit'` when no `users` row exists.
2. `getActionBarStyle` returns `'speed_dial'` after `setActionBarStyle('speed_dial')`.
3. `setActionBarStyle` throws for an unrecognized value.

### `TransactionList.test.tsx` (updated)

1. Renders section headers with correct date labels ("Today", "Yesterday", weekday format).
2. Section header right side shows the day net total (expenses − income).
3. Income rows have `testID` attribute `tx-row-income-<id>` with a green left-border style applied.
4. Expense rows have `testID` `tx-row-expense-<id>` with a muted left-border style.
5. Income rows are not tappable (no `onPress`).
6. Month navigation prev/next arrows re-render entries for the navigated month.
7. Next arrow is disabled when viewing the current calendar month.
8. Category chip filter applies only to expense rows; income rows always appear.
9. Empty state renders "No transactions in …" when feed is empty.
10. Expense rows render the mapped category Ionicons icon.
11. Income rows render the mapped source Ionicons icon.
12. An expense with an unknown category id renders a letter-avatar fallback.

### `TransactionsScreen.test.tsx` (updated)

1. In `explicit` style: renders Quick Add compact button and Log Expense primary button, both visible.
2. In `explicit` style: does NOT render a Log Income button.
3. In `speed_dial` style: renders a single "+" FAB; the two individual buttons are not visible.
4. Tapping the "+" FAB in speed_dial style reveals Log Expense and Quick Add options.
5. Does NOT render Recurring, Debts, or Settings buttons in either style.

### `QuickAddScreen.test.tsx` additions

1. Template tiles render an Ionicons icon (or letter-avatar) for their mapped category.

---

## Acceptance Check (Done When)

- Transactions tab shows income and expenses together, grouped by date with section headers (date label
  left, net total right), scoped to the current month. Prev/next arrows browse months.
- Each row has a colored left border (green income, muted expense) and a category/source icon.
- Quick Add tiles show category icons. Category Picker shows icons beside names.
- The FAB shows Quick Add + Log Expense in `explicit` mode; a single "+" in `speed_dial` mode.
- Log Income is not accessible from the Transactions tab.
- Every tab header has a gear icon that opens Settings.
- Settings has an "Action bar style" section; selection persists and immediately changes the FAB.
- Every pushed screen has a back chevron or Cancel label.
- `npm test` — new and updated tests all pass; full suite stays green.
- `/check-arch` clean: no new cross-feature edges; `expenses` still only imports from `budget`
  (approved); no `expenses → auth` import.

---

## Design Decisions

1. **Route prop for `actionBarStyle` (not `expenses → auth` edge).** Mirrors the VS-08/VS-13 precedent
   where app-mode gating is done at the route, not inside the feature screen.

2. **`services/transactions.ts` in shared services, not a feature.** The unified feed spans two feature
   tables; neither feature should own a query that reads the other's table.

3. **Category chip filter shows income rows always.** Income entries have no "category" — filtering by
   category is an expense-only concept. Income rows appearing regardless of which chip is selected is
   the least-surprising behaviour and avoids building a parallel source-filter chip row (out of scope).

4. **Speed dial uses a Modal, not an animated overlay.** The existing codebase has a `Modal` primitive.
   A spring-animated speed dial would require a new library or significant custom animation work — not
   justified for this slice.

5. **ScreenHeader is a component, not a navigator option.** Expo Router's Stack navigator provides its
   own back button for pushed screens, but its header styling is harder to theme consistently (navigator
   options are per-route, not centrally styled). Placing `ScreenHeader` inside the component gives full
   control over appearance and a single source of truth. Where a navigator header already exists, set
   `headerShown: false` on the `<Stack.Screen>` and let `ScreenHeader` take over.

6. **`useTransactions` is updated in place, not duplicated.** There is only one caller (`TransactionList`);
   splitting it into two hooks would add complexity with no benefit.

---

## Out of Scope (Deferred to VS-17)

- Tappable expense rows (opens `ExpenseDetailScreen`).
- Income edit/delete (complex allocation reversal — requires dedicated scope).
- Subcategory-level icons (only parent categories are mapped; subcategories fall back to parent icon or
  avatar).
- Drag-to-reorder quick-add tiles with icon persistence.

---

## After This Slice

1. Run `/check-arch` — confirm no new unapproved cross-feature edge; `services/transactions.ts` imports
   no feature folder.
2. Invoke `code-reviewer` on the branch diff. Address any BLOCK.
3. Mark VS-16 `✅ Done` in `docs/KANBAN.md` with test counts (migration: 016).
4. VS-17 (Expense Edit & Delete) is now unblocked.
