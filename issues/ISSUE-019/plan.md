# ISSUE-019 / VS-20 — Phase 2 Implementation Plan

Maps every Scope bullet of `implementation-plan.md` to exact files, in TDD order.
Blockers verified Done in KANBAN: VS-05 ✅, VS-16 ✅, VS-19 ✅.

---

## M1 — Service & types

**Files modified:**
- `src/features/finance/income/__tests__/income.service.test.ts` — tests first
- `src/features/finance/income/income.types.ts` — add `UpdateIncome`
- `src/features/finance/income/income.service.ts` — `getIncomeById`, `updateIncome`, `deleteIncome`

**Order:** red tests → types → service → green.

**Tests (in-memory SQLite, existing harness in that file):**
1. `getIncomeById` returns the mapped row (camelCase fields incl. `accountId`, `allocationStatus`); `null` for unknown id.
2. `updateIncome` on a *pending* row edits amount, source, date, note, accountId (incl. null↔value both directions).
3. `updateIncome` validation: rejects non-positive/non-integer amount and unknown source (mirrors `createIncome`); throws `Income not found.` for unknown id.
4. `updateIncome` on an *allocated* row: amount change → throws `Allocated income cannot change amount or date.`; date change → same; metadata-only patch (same amount+date, new source/note/accountId) succeeds.
5. `deleteIncome` removes a pending row; throws `Allocated income cannot be deleted.` on an allocated row; throws `Income not found.` for unknown id.

**Design decisions:**
- `UpdateIncome = Pick<Income, 'amount' | 'source' | 'date' | 'note' | 'accountId'>` — a *full-row* patch like the form submits. **Rejected:** partial-field patch à la `updateExpense`'s `Partial<…>` diffing — the allocated-lock check is much clearer against a full patch (compare two values), and the hook already holds all five fields.
- Lock enforcement reads the existing row first (1 SELECT + 1 UPDATE). **Rejected:** a single conditional UPDATE with `WHERE allocation_status = 'pending'` — it can't distinguish "not found" from "locked" for error messages.
- `updateIncome` reuses `createIncome`'s amount/source validation so no caller can write bad rows (CLAUDE.md service-layer rule).

## M2 — Hook

**Files modified:**
- `src/features/finance/income/__tests__/income.hooks.test.ts` — tests first (file exists)
- `src/features/finance/income/income.hooks.ts` — add `useIncomeEdit(id)`

**Shape (mirrors `useExpenseEdit`):** field state `amount/source/date/note/accountId` + setters, `isAllocated: boolean`, `loading`, `error`, `canSubmit` (positive integer amount + source set), `update(): Promise<boolean>`, `remove(): Promise<boolean>`. Booleans (not throws) so the screen can navigate on `true` — VS-17 precedent.

**Tests:** load populates fields + `isAllocated`; `update` submits the full patch and returns true; service rejection lands in `error` and returns false; `remove` deletes (true) / surfaces error (false); unknown id → `error = 'Income not found.'`.

**Design decision:** no original-value diffing (unlike `useExpenseEdit`, which diffs to support the over-budget check on amount *increase*). Income has no equivalent check; the full patch goes to the service. **Rejected:** copying the diff machinery — dead complexity here.

## M3 — Screen, route, feed wiring

**Files created:**
- `src/features/finance/income/IncomeDetailScreen.tsx` — `ScreenHeader("Income")`; pending: AmountInput + IncomeSourcePicker + DateField + note TextInput + AccountPicker + Save (toast → back) + "Allocate now" (`router.push('/income/allocate', { amount, month: date.slice(0,7), incomeId })`) + Delete behind the `Modal` confirmation pattern from `ExpenseDetailScreen`; allocated: amount + date as read-only rows with one muted explainer, Delete/Allocate-now absent, Save still active for metadata.
- `src/features/finance/income/IncomeDetailRoute.tsx` — param validation, byte-for-byte pattern of `ExpenseDetailRoute`.
- `src/app/income/[id].tsx` — one-line default export (app/ CLAUDE.md canonical form).
- `src/features/finance/income/__tests__/IncomeDetailScreen.test.tsx` + `__tests__/IncomeDetailRoute.test.tsx` — tests first.

**Files modified:**
- `src/features/finance/expenses/TransactionRow.tsx` — income rows become `Pressable`; new `onPressIncome: (id: number) => void` prop.
- `src/features/finance/expenses/TransactionList.tsx` — threads `onPressIncome={(id) => router.push(`/income/${id}`)}`.
- `src/features/finance/expenses/__tests__/TransactionList.test.tsx` — the two "income rows are not tappable" tests flip to assert `mockPush` with `/income/10`.

**Design decisions:**
- Keep the entry fields inline in `IncomeDetailScreen` unless it crosses the 300-line cap; only then extract a shared `IncomeEntryFields`. **Rejected:** extracting up front — `IncomeEntryPanel` has differing concerns (allocate-on-save flow) and premature sharing couples the two forms.
- Navigation stays a path push from the expenses feature (no `expenses → income` import; no ARCHITECTURE.md change). **Rejected:** importing the income screen — forbidden edge.

## M4 — Verification & close

1. Full suite (`npx jest src`) — expect green (1 known flaky auth CHECK test passes in isolation).
2. `/check-arch` logic inline on the branch diff — no new cross-feature imports expected.
3. `code-reviewer` subagent on the `vs-20-income-edit` diff; address BLOCKs.
4. KANBAN: VS-20 `🟡 In Progress` at implementation start → `✅ Done` with the summary note at close.

## Out of scope (restated)

Allocation reversal; sync delete tombstones (plain DELETE per VS-17 precedent, documented); income history filters.
