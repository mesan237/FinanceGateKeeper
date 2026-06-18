# ISSUE-019 — Income Detail & Edit

**Maps to:** KANBAN VS-20
**Priority:** Medium
**Blocked by:** VS-05 Income Logging (✅), VS-16 Transaction UX (✅), VS-19 Deferred Income Allocation (✅)

---

## Scope Decisions (settled before drafting)

**1. The allocated lock is the heart of the slice.**
VS-17 deferred income edit because "reversing an allocation requires dedicated scope": once income is
Confirmed, its amount has been counted into the month's expense budget and concrete deposits were
written to `fund_transactions` / `project_transactions`. Reversing those is genuinely hard (the fund may
have been spent since; redistribution may have fired). VS-19's `allocation_status` makes a clean line
possible without solving reversal:

- `pending` income — nothing downstream has consumed it → **fully editable and deletable**.
- `allocated` income — its money trail is immutable → **amount and date are locked**; only metadata
  (source, note, accountId) may change. Deletion is rejected.

The lock is enforced **in the service layer**, not just the UI — `updateIncome` on an allocated row
rejects any patch that changes `amount` or `date`; `deleteIncome` rejects allocated rows outright. The
screen mirrors the rule (disabled inputs + explanatory line) but is not the enforcement point.

**2. Why amount stays locked even though no FK breaks.**
Changing an allocated row's amount would silently change `getMonthlyBudget`'s expense budget (it sums
allocated income) *without* changing the deposits that were actually made — the books would no longer
reconcile. Locked is the only coherent option short of full reversal, which stays out of scope.

**3. `updateIncome` takes a full-row patch, service-validated.**
Signature mirrors VS-17's `updateExpense`: `updateIncome(id, patch: UpdateIncome): Promise<void>` where
`UpdateIncome = { amount, source, date, note, accountId }`. The service loads the existing row first;
if `allocation_status = 'allocated'` and `patch.amount !== row.amount || patch.date !== row.date`, throw
(`'Allocated income cannot change amount or date.'`). Unknown id throws `'Income not found.'` —
matching `deleteExpense`'s precedent.

**4. Deletes are plain DELETEs — the VS-17 sync caveat carries over, documented not solved.**
`services/sync.ts` has no tombstones; `deleteExpense` (VS-17) is a plain `DELETE` and a previously
pushed row can resurrect on the next pull. `deleteIncome` knowingly inherits the same limitation. In
practice the window is small (pending income is usually allocated or deleted before a push round-trip),
and a sync-tombstone design is a cross-cutting follow-up, not something to bolt on in this slice.
Called out here so the decision is explicit.

**5. Route + screen follow the VS-17 detail pattern exactly.**
`app/income/[id].tsx` is a one-line default export rendering `IncomeDetailRoute`; the Route wrapper
owns `useLocalSearchParams` parsing/validation (non-numeric id → back) and renders
`IncomeDetailScreen` with a typed `incomeId: number` prop. No param parsing in `app/`.

**6. Pending rows offer "Allocate now".**
The detail screen of a pending row is also the natural jumping-off point into the existing VS-19 flow:
an "Allocate now" button pushes `/income/allocate` with `{ amount, month, incomeId }` exactly as
`IncomeEntryPanel` does after logging. No new allocation UI is built.

**7. Feed navigation is a route push, not a cross-feature import.**
`TransactionRow.tsx` (expenses feature) makes income rows pressable with
`router.push(`/income/${item.id}`)` — mirroring how expense rows already navigate. Pushing a path
string creates no `expenses → income` import edge; ARCHITECTURE.md needs no change.

**8. Editing marks the row sync-dirty automatically.**
`income`'s VS-15 update trigger fires on `DATA_COLUMNS` changes (which include `amount`, `source`,
`date`, `note`, `account_id`), so `updateIncome` needs no manual `sync_status` handling.

**9. Reuse the existing form vocabulary; save confirms via the shared toast.**
AmountInput (hero amount), IncomeSourcePicker, TextInput (note), DateField, AccountPicker — the same
stack `IncomeEntryPanel` uses. On save: `useToast().show(...)` + `router.back()`, the same feedback
pattern the expense flows now use.

---

## §1. Service (`income.service.ts`)

- `getIncomeById(id: number): Promise<Income | null>` — single-row SELECT mapped like `getAllIncome`.
- `updateIncome(id: number, patch: UpdateIncome): Promise<void>` — per decision 3; single UPDATE
  setting amount/source/date/note/account_id.
- `deleteIncome(id: number): Promise<void>` — throws on unknown id; throws
  `'Allocated income cannot be deleted.'` when `allocation_status = 'allocated'`; otherwise DELETE.
- `income.types.ts`: add `UpdateIncome`.

**Tests** (in-memory SQLite, no mocking, colocated in `__tests__/income.service.test.ts`):
- getIncomeById returns the mapped row; null for unknown id.
- updateIncome edits every field on a pending row; persists accountId null↔value both ways.
- updateIncome on an allocated row: amount change rejected; date change rejected; metadata-only patch
  (same amount/date) succeeds.
- deleteIncome removes a pending row; rejects an allocated row; throws on unknown id.

## §2. Hook (`income.hooks.ts` — `useIncomeEdit`)

Mirrors `useExpenseEdit`: loads the row on mount (`loading` / `notFound`), exposes field state
pre-filled from the row, `isAllocated`, `canSubmit` (amount > 0, source set, valid date — same rules as
the log form), `submit()` → `updateIncome`, `remove()` → `deleteIncome`, `error` surface for service
rejections.

**Tests:** load → fields populated; submit patches and resolves; remove deletes; allocated row exposes
`isAllocated = true`; service rejection lands in `error`.

## §3. Screen (`IncomeDetailScreen.tsx`)

- `ScreenHeader` ("Income", back chevron).
- Pending: AmountInput, IncomeSourcePicker, DateField, note TextInput, AccountPicker, Save (toast on
  success → back), "Allocate now" (decision 6), Delete with the shared confirmation-modal pattern from
  `ExpenseDetailScreen`.
- Allocated: amount + date rendered as read-only text with one muted explanatory line ("Allocated
  income can't change amount or date."); source/note/account remain editable; Save visible; Delete and
  Allocate-now absent.
- Stays under the 300-line cap; if the form body pushes past it, extract `IncomeEntryFields` shared
  with `IncomeEntryPanel` rather than duplicating.

**Tests (RTL):** pending renders pre-filled + saves (service called with patch, toast not asserted) +
deletes after confirmation + Allocate-now pushes `/income/allocate` with id/amount; allocated hides
Delete, disables amount, still saves a metadata patch; unknown id renders not-found state.

## §4. Route & feed wiring

- `IncomeDetailRoute.tsx` (param validation per decision 5) + `app/income/[id].tsx`.
- `TransactionRow.tsx`: income rows become `Pressable` with `onPressIncome(id)` callback threaded from
  `TransactionList` (mirrors `onPressExpense`).
- Update the two `TransactionList` tests that assert income rows are non-tappable → now assert
  navigation to `/income/{id}`.

## §5. Milestones

1. **M1 — service + types** (tests first, red→green).
2. **M2 — hook** (tests first).
3. **M3 — screen + route + feed wiring** (RTL tests; update TransactionList expectations).
4. **M4 — `/check-arch`, full suite, KANBAN status to Done.**

## Out of Scope

- Reversing/unwinding an allocation (deposits stay immutable — would need its own slice).
- Sync delete tombstones (decision 4).
- Income history filters (VS-05 deferral, unrelated).
