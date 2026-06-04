# ISSUE-005 — Implementation Plan (Phase 2)

Derived from `implementation-plan.md`. Maps every Scope bullet to concrete files,
in TDD write-order, with the design decisions made along the way. Mirrors the
VS-03 expenses slice patterns (service → hooks → UI → route, in-memory
better-sqlite3 tests).

**Blocker check:** VS-05 is blocked by VS-01 only, which is ✅ Done (KANBAN row).
Clear to proceed.

---

## File-by-file mapping

| # | Scope bullet | File | New/Mod |
|---|--------------|------|---------|
| 1 | Constants | `src/constants/incomeSources.ts` | New |
| 2 | Types | `src/features/finance/income/income.types.ts` | New |
| 3 | DB migration | `src/services/migrations/004_create_income_table.ts` | New |
| 4 | Migration registry | `src/services/migrations/index.ts` | Mod |
| 5 | Service | `src/features/finance/income/income.service.ts` | New |
| 6 | Hooks | `src/features/finance/income/income.hooks.ts` | New |
| 7 | Source picker | `src/features/finance/income/IncomeSourcePicker.tsx` | New |
| 8 | Log screen | `src/features/finance/income/IncomeLogScreen.tsx` | New |
| 9 | Route | `src/app/income/log.tsx` | New |

Test files (written **before** their implementation per Red-Green-Refactor):

- `src/features/finance/income/__tests__/income.service.test.ts`
- `src/features/finance/income/__tests__/income.hooks.test.ts`
- `src/features/finance/income/__tests__/IncomeSourcePicker.test.tsx`
- `src/features/finance/income/__tests__/IncomeLogScreen.test.tsx`

---

## Write order (TDD)

1. **`constants/incomeSources.ts`** (no standalone test — exercised by service +
   picker tests). `INCOME_SOURCES` as an `as const` tuple; `IncomeSource` derived
   from it. Labels: Salary / Freelance / E-commerce.
2. **`income.types.ts`** — re-exports `IncomeSource` from the constant (see
   Decision A), plus `Income`, `NewIncome`, `IncomeFilter`.
3. **`004_create_income_table.ts`** + register as id 4 in `migrations/index.ts`.
   Exercised by the service test's `runMigrations`.
4. **Service** — RED: `income.service.test.ts`; GREEN: `income.service.ts`.
5. **Hooks** — RED: `income.hooks.test.ts`; GREEN: `income.hooks.ts`.
6. **Source picker** — RED: `IncomeSourcePicker.test.tsx`; GREEN: `IncomeSourcePicker.tsx`.
7. **Log screen** — RED: `IncomeLogScreen.test.tsx`; GREEN: `IncomeLogScreen.tsx`.
8. **Route** — `app/income/log.tsx` (thin; no test, matching `app/expenses/log.tsx`).

After all green: run `/check-arch` logic, then the `code-reviewer` subagent,
then flip KANBAN VS-05 → ✅ Done.

---

## Key implementation details

- **Migration:** `id INTEGER PK AUTOINCREMENT, amount INTEGER NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('salary','freelance','ecommerce')),
  note TEXT, date TEXT NOT NULL, created_at TEXT NOT NULL`; index
  `idx_income_date` on `(date)`.
- **`getMonthlyTotal(monthISO)`:** `SELECT COALESCE(SUM(amount),0) AS total FROM
  income WHERE date LIKE ?` with param `"YYYY-MM-%"` — uses the date index,
  returns 0 on no match.
- **Service validation:** `amount` must be a positive integer; `source` must be
  a member of `INCOME_SOURCES` values (runtime Set check, not just the TS union).
- **Row mapping:** snake_case DB → camelCase (`created_at` → `createdAt`),
  mirroring `mapExpense`.
- **`useIncomeLog`:** `{ amount, setAmount, source, setSource, note, setNote,
  date, setDate, submit, canSubmit, error }`; `canSubmit = numericAmount > 0 &&
  source !== null`; date defaults to `toISODate(new Date())`. `submit` clears the
  form on success and returns the new id (or null).
- **`useIncomeHistory(filter?)`:** `{ income, loading, error, refresh }`;
  source filter takes precedence, then date range, else all.
- **`IncomeLogScreen`:** form (amount, `IncomeSourcePicker` inline, note, date) +
  Save; recent list = first 10 of `useIncomeHistory()`. On save success: form
  clears (via hook) and `history.refresh()` runs; no navigation. Row renders
  `formatCurrency(amount)` + muted `"<SourceLabel> · <dd Mon>"`.
- **`IncomeSourcePicker`:** props `{ value: IncomeSource | null; onChange }`;
  one pill per `INCOME_SOURCES`; selected pill filled `PRIMARY_GREEN` and exposes
  `accessibilityState.selected`. Modeled on the `Chip` in `TransactionList`.

---

## Design decisions (and rejected alternatives)

**A. `IncomeSource` single source of truth lives in `constants/incomeSources.ts`,
re-exported by `income.types.ts`.**
The plan lists `INCOME_SOURCES` in constants typed with `IncomeSource`, and
`income.types.ts` as the type's home. But the dependency rule forbids
`constants/` from importing `features/`. Resolution: derive `IncomeSource` from
the `as const` tuple in the constant, and `export type { IncomeSource }` from
`income.types.ts`. The feature's documented type contract is preserved, the
dependency arrow points the legal way (features → constants), and the enum and
its labels stay co-located. Rejected: defining the union in `income.types.ts`
and importing it into the constant (a `constants → features` violation
`/check-arch` would flag); and hoisting it to `types/global.ts` (over-shares a
feature-local enum). This mirrors how `constants/categories.ts` defines its own
`DefaultCategory` shape rather than importing from a feature.

**B. No navigation on save in VS-05, despite `income/CLAUDE.md`.**
The slice's `CLAUDE.md` says "after saving income, navigate to
`budget/AllocationScreen`." The implementation-plan's locked decision #3 defers
that wiring to VS-06. I follow the plan: `submit` stays standalone. Flagging so
the reviewer doesn't treat the CLAUDE.md line as a missing requirement — it
describes the post-VS-06 end state and will be reconciled there.

**C. Add `income.hooks.test.ts` even though the plan's TDD Anchors omit it.**
`features/finance/CLAUDE.md` requires "every new service function and hook ships
with a Jest test." The screen test exercises the hooks indirectly, but a direct
hooks test satisfies the rule explicitly and guards `canSubmit`, form-clear, and
filter-precedence logic. Rejected: relying solely on the screen test (leaves the
rule technically unmet).

**D. Recent-income list slices to 10 in the screen, not in SQL.**
`useIncomeHistory` returns the full ordered set; the screen renders the first 10.
Keeps the hook reusable for VS-14 reports (which need the full history) without a
`limit` parameter. Rejected: a `LIMIT 10` in the service (couples the query to
one screen's display concern).
