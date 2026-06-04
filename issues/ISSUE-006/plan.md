# ISSUE-006 — Implementation Plan (Phase 2)

Derived from `implementation-plan.md`. Maps every Scope bullet to concrete files,
in TDD write-order, with the design decisions made along the way. Mirrors the
VS-03 expenses and VS-05 income slice patterns (constants → types → migration →
service → hooks → UI → route, in-memory better-sqlite3 tests).

**Blocker check:** VS-06 is blocked by VS-03 (✅ Done) and VS-05 (✅ Done) per
the KANBAN status table. Clear to proceed.

---

## File-by-file mapping

| #  | Scope bullet                | File                                                                        | New/Mod |
|----|-----------------------------|-----------------------------------------------------------------------------|---------|
| 1  | Constants                   | `src/constants/allocation.ts`                                               | New     |
| 2  | Types                       | `src/features/finance/budget/budget.types.ts`                               | New     |
| 3  | DB migration                | `src/services/migrations/005_create_allocations_table.ts`                   | New     |
| 4  | Migration registry          | `src/services/migrations/index.ts`                                          | Mod     |
| 5  | Service                     | `src/features/finance/budget/budget.service.ts`                             | New     |
| 6  | Hooks                       | `src/features/finance/budget/budget.hooks.ts`                               | New     |
| 7  | Allocation settings UI      | `src/features/finance/budget/AllocationSettings.tsx`                        | New     |
| 8  | Allocation screen UI        | `src/features/finance/budget/AllocationScreen.tsx`                          | New     |
| 9  | Budget overview UI          | `src/features/finance/budget/BudgetOverview.tsx`                            | New     |
| 10 | Settings route              | `src/app/budget/settings.tsx`                                               | New     |
| 11 | Allocate route              | `src/app/income/allocate.tsx`                                               | New     |
| 12 | Budget tab route            | `src/app/(tabs)/budget.tsx`                                                 | Mod     |
| 13 | Income → Allocate wire-up   | `src/features/finance/income/IncomeLogScreen.tsx`                           | Mod     |
| 14 | Update income test          | `src/features/finance/income/__tests__/IncomeLogScreen.test.tsx`            | Mod     |

Test files (written **before** their implementation per Red-Green-Refactor):

- `src/features/finance/budget/__tests__/budget.service.test.ts`
- `src/features/finance/budget/__tests__/budget.hooks.test.ts`
- `src/features/finance/budget/__tests__/AllocationSettings.test.tsx`
- `src/features/finance/budget/__tests__/AllocationScreen.test.tsx`
- `src/features/finance/budget/__tests__/BudgetOverview.test.tsx`

---

## Write order (TDD)

1. **`constants/allocation.ts`** (no standalone test — exercised by service +
   UI tests). `BUCKET_VALUES` as an `as const` tuple; `Bucket` derived from it;
   `BUCKET_LABELS` map; `DEFAULT_ALLOCATION` literal.
2. **`budget.types.ts`** — re-exports `Bucket` from the constant (see
   Decision A), plus `Allocation`, `AllocationDraft`, `AllocationBreakdown`,
   `MonthlyBudget`.
3. **`005_create_allocations_table.ts`** + register as id 5 in
   `migrations/index.ts`. Exercised by `budget.service.test.ts`'s
   `runMigrations`.
4. **Service** — RED: `budget.service.test.ts`; GREEN: `budget.service.ts`.
5. **Hooks** — RED: `budget.hooks.test.ts`; GREEN: `budget.hooks.ts`.
6. **AllocationSettings** — RED: `AllocationSettings.test.tsx`; GREEN: component.
7. **AllocationScreen** — RED: `AllocationScreen.test.tsx`; GREEN: component.
8. **BudgetOverview** — RED: `BudgetOverview.test.tsx`; GREEN: component.
9. **Routes** — `app/budget/settings.tsx`, `app/income/allocate.tsx`,
   `app/(tabs)/budget.tsx`. Thin; no separate tests (matches
   `app/income/log.tsx` / `app/expenses/log.tsx`).
10. **Income wire-up** — modify `IncomeLogScreen` to navigate on save success;
    update its existing test (`IncomeLogScreen.test.tsx`) to assert navigation
    instead of inline-list refresh.

After all green: run `/check-arch` logic, then the `code-reviewer` subagent,
then flip KANBAN VS-06 → ✅ Done.

---

## Key implementation details

### Migration

```
CREATE TABLE IF NOT EXISTS allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  month TEXT NOT NULL UNIQUE,
  emergency_fund_pct INTEGER NOT NULL,
  savings_pct INTEGER NOT NULL,
  projects_pct INTEGER NOT NULL,
  expenses_pct INTEGER NOT NULL,
  priority_order TEXT NOT NULL,
  is_locked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_allocations_month ON allocations(month);
```

`UNIQUE(month)` is the integrity hook: it guarantees one row per `YYYY-MM`,
which the service relies on for `getOrCreateCurrentAllocation`. No `down`
migration (mirrors 001–004; immutable forward-only).

### Service

- **Row shape:** `AllocationRow` interface mirrors snake_case columns;
  `mapAllocation` converts to camelCase and parses `priority_order` from JSON
  into `Bucket[]`.
- **`calculateBreakdown(amount, allocation)`:** integer floor division per
  bucket (`Math.floor(amount * pct / 100)`), then the residual
  `amount − sumOfThree` is added to `expenses` so the four numbers sum to
  `amount` exactly. Pure function — no DB, no async.
- **`updateAllocation` validation order:** percentage range → percentages-sum →
  priority-order permutation → lock-state. Each failure throws a distinct
  message the hook surfaces as `error`. No DB write on any failure.
- **`getOrCreateCurrentAllocation`:** single round trip — `INSERT OR IGNORE`
  with the defaults, then `SELECT` by `month`. `INSERT OR IGNORE` is safe
  because of `UNIQUE(month)` and avoids a race between read and write.
- **`getExpensesMonthlyTotal`:** mirrors `income.getMonthlyTotal` —
  `SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date LIKE ?` with
  `${monthISO}-%`. Reads the existing `expenses` table; no new index needed
  (VS-03 already indexed `date`).
- **`getMonthlyBudget`:** composes a private `getIncomeMonthlyTotal` helper,
  `getOrCreateCurrentAllocation`, `calculateBreakdown`, and
  `getExpensesMonthlyTotal`. The income total is read by querying the
  `income` table directly inside `budget.service` rather than calling
  `incomeService.getMonthlyTotal` — see Decision D below. Mirrors the
  `getExpensesMonthlyTotal` pattern.

### Hooks

- **`useAllocation(monthISO)`:** mounts → `getOrCreateCurrentAllocation` →
  exposes `{ allocation, loading, error, save, lock, refresh }`. `save(draft)`
  wraps `updateAllocation` in `try/catch`, setting `error` on failure (no
  re-throw); on success, re-runs `getAllocation` to mirror the new state.
  `lock()` calls `lockAllocation` then refreshes.
- **`useBudgetStatus(monthISO)`:** mounts → `getMonthlyBudget` → exposes
  `{ budget, loading, error, refresh }`. `refresh` is called explicitly by
  callers after income/expense writes (no global event bus).

### `AllocationSettings.tsx`

- Four `TextInput` rows, one per bucket, using the existing shared
  `@/components/TextInput` primitive with `keyboardType="numeric"` and
  `accessibilityLabel={bucketLabel}`.
- A "Total: NN%" `Typography variant="muted"` row updates as the user types.
- Save button uses the shared `@/components/Button` with `disabled={!isValid}`,
  where `isValid = pctTotal === 100 && !allocation.isLocked`.
- Reorder section: a vertical list of four rows; each row shows the bucket
  label and two icon-only `Pressable` buttons (up arrow ↑, down arrow ↓).
  Top row's ↑ is `accessibilityState.disabled` and a no-op; bottom row's ↓
  same. State is local; persisted on Save (alongside percentages).
- Locked banner: when `allocation.isLocked`, render a `Typography` row with
  text "Locked for this month — comes back next month." All inputs receive
  `editable={false}`; all arrows receive `disabled` + `accessibilityState.disabled`.

### `AllocationScreen.tsx`

- Props: `{ amountFCFA: number; monthISO: string }`.
- Loads allocation via `useAllocation(monthISO)`; while `loading`, shows a
  muted "Loading…" line.
- Once loaded: renders the breakdown computed by `calculateBreakdown` in the
  allocation's `priorityOrder`. Each row shows the bucket label and
  `formatCurrency(amount)`.
- Confirm button (`@/components/Button`) calls `lock()` and on success runs
  `router.replace('/(tabs)/dashboard')`. Disabled while `loading` or while
  `lock` is in-flight (a local `isConfirming` flag).
- Error surface: if `error` non-null, show it under the bucket list in
  `DANGER` color (mirrors `IncomeLogScreen`).

### `BudgetOverview.tsx`

- Loads `useBudgetStatus(currentMonthISO)`; while loading, "Loading…".
- When `budget.incomeTotal === 0`: render only the heading, a muted empty
  state "Log income to start tracking your budget.", and the "Edit allocation"
  button.
- When `budget.incomeTotal > 0`: render four bucket rows (priority order),
  the prominent "Expenses remaining: NNN FCFA" row in `Typography variant="heading"`,
  and the "Edit allocation" button under them.
- A small "🔒 Locked for this month" tag near the heading when
  `budget.allocation.isLocked`.

### Routes

- `src/app/budget/settings.tsx` — thin: `<AllocationSettings />`.
- `src/app/income/allocate.tsx` — reads `useLocalSearchParams()`, validates
  `amount` is a positive integer string and `month` matches `^\d{4}-\d{2}$`,
  renders `<AllocationScreen amountFCFA={…} monthISO={…} />` or a muted
  "Invalid allocation parameters" line.
- `src/app/(tabs)/budget.tsx` — replaces the placeholder `<View />` with
  `<BudgetOverview />`.

### Income wire-up

- `IncomeLogScreen.handleSave`:
  ```ts
  const persistedAmount = Math.trunc(Number(log.amount));
  const persistedMonth = log.date.slice(0, 7); // YYYY-MM
  const id = await log.submit();
  if (id !== null) {
    router.push({
      pathname: '/income/allocate',
      params: { amount: String(persistedAmount), month: persistedMonth },
    });
  }
  ```
- The inline `FlatList` recent-income block is removed alongside the
  `useIncomeHistory` import. The recent heading is removed too.
- `IncomeLogScreen.test.tsx` is updated to mock `expo-router`'s `router.push`
  and assert it is called with the expected pathname and params after a
  successful save. The existing "recent list contains entry after save" case
  is replaced with the navigation assertion.

---

## Design decisions (and rejected alternatives)

**A. `Bucket` single source of truth lives in `constants/allocation.ts`,
re-exported by `budget.types.ts`.**
Same pattern as VS-05's `IncomeSource`: define the enum-as-tuple in
`constants`, derive the TS union from `typeof`, and re-export the type from
the feature's `*.types.ts` so the feature's contract is preserved. Dependency
arrow points the legal way (`features → constants`). Rejected: defining the
union in `budget.types.ts` and importing into the constant (`constants →
features` violation `/check-arch` would flag).

**B. Reorder UI uses up/down arrows, not drag-to-reorder.**
KANBAN says "drag-to-reorder priority". Implementing real drag in React
Native without a library means writing PanResponder math by hand; with a
library means a new dependency (`react-native-draggable-flatlist`). Up/down
arrows give the same outcome (the user can rearrange the four buckets) with
zero new deps, simple unit-test coverage, and full accessibility. If a future
polish slice needs true drag we promote then. Flagging so the reviewer
doesn't treat KANBAN's wording as a missing requirement.

**C. The income screen drops its inline recent-income list rather than
keeping it as a fallback.**
The VS-05 `implementation-plan.md` "After This Slice" section anticipated
this: VS-06 owns the navigation wire-up. Keeping the list means showing it
for a brief moment between `submit()` resolving and `router.push` running —
a flicker no user benefits from. The list's home is a future history route
or VS-14 Reports. The existing `IncomeLogScreen.test.tsx` case "after save,
the recent-income list contains the new entry" is replaced with "after save,
`router.push` is called with the allocate pathname and the persisted amount".
Rejected: keeping the list (dead UI on the canonical path, flicker on save).

**D. `getExpensesMonthlyTotal` lives in `budget.service`, and a private
`getIncomeMonthlyTotal` is added for income too.**
The cross-feature dep table approves `budget → expenses` but does *not*
list `budget → income`. So `budget.service` reads both tables directly via
`@/services/database`'s `query()`, with a private `getIncomeMonthlyTotal`
helper that duplicates the 4-line `SELECT SUM(amount) FROM income WHERE date
LIKE '?-%'` from `income.service.getMonthlyTotal`. This keeps the slice
self-contained at the module-import level. Rejected: importing
`incomeService.getMonthlyTotal` (would force a new approved cross-feature
dep entry); a shared `monthly-totals` util (over-shares; both income and
expenses already own their own query).

**E. `INSERT OR IGNORE` for default-allocation upsert.**
Race-safe by virtue of `UNIQUE(month)` and one round trip. Rejected: a
`SELECT-then-INSERT-if-missing` pair (TOCTOU race between two simultaneous
hook mounts), and a transaction wrapper (overkill for one-row idempotency).

**F. `lockAllocation` is idempotent; no `unlockAllocation` exists in this
slice.**
Confirming twice (e.g. a user re-opens the allocate route with the same
month) is a no-op rather than an error. There is intentionally no unlock
service method — locked months are immutable until the next month rolls
over. If a "redo this month" affordance is ever needed it ships as an
explicit feature, not a silent reset. Rejected: a "force-edit" toggle in
Settings (foot-gun).

**G. Allocate route reads `amount`/`month` from search params, validates,
and falls back to a muted message if invalid.**
Search params are persistent across reload and debuggable. The validation
guards a stray manual navigation (no `amount=` typed in a URL) from crashing
the screen. Rejected: a `useAllocationDraft` context populated on income
save (new state plumbing, breaks on reload).

**H. `useBudgetStatus.refresh` is caller-driven, not event-driven.**
The Budget tab calls `refresh` on focus (via `useFocusEffect` from
`expo-router`); income/expense screens don't need to know about it because
the tab re-mounts on focus anyway. Rejected: a global event bus or a
`refresh-budget` query invalidation layer — premature; one tab consumer.

**I. `calculateBreakdown` assigns the rounding remainder to `expenses`,
not "the largest bucket".**
The `expenses` bucket is the residual by convention (PRD §5.2 "Expenses —
whatever remains becomes the spending budget"). Assigning the remainder
there makes the policy explicit and mirrors the user's mental model.
Rejected: largest-bucket-gets-the-remainder (correct but the policy is
implicit and harder to explain in a UI message later).
