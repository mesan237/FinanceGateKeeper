# ISSUE-018 — Accounts & Payment Channels

**Maps to:** KANBAN VS-18
**Priority:** High
**Blocked by:** VS-16 Transaction UX (✅), VS-17 Expense Edit & Delete (✅)

---

## Scope Decisions (settled before drafting)

**1. New feature slice: `src/features/finance/accounts/`.**
Accounts are a first-class domain (wallets / payment channels), not a sub-concern of expenses. They get
the four canonical files (`accounts.types.ts`, `accounts.service.ts`, `accounts.hooks.ts`) plus their
own screens, and they are consumed by `expenses`, `income`, `funds`, `projects`, and `dashboard`. New
approved cross-feature edges are required (see §0).

**2. Balance is computed, never stored.**
`getAccountBalance(id)` derives the live balance from the transaction tables on every read. No
`balance` column on `accounts`. This avoids a denormalised total that can drift out of sync with its
constituent rows — the same discipline `funds.current_amount`/`projects.funded_amount` would ideally
follow but here we have no incremental writer to keep correct. Formula:

```
opening_balance
  + SUM(income.amount       WHERE account_id = id)
  − SUM(expenses.amount     WHERE account_id = id)
  + SUM(transfers.amount    WHERE to_account_id   = id)
  − SUM(transfers.amount    WHERE from_account_id = id)
  − SUM(fund_transactions.amount    WHERE account_id = id AND direction = 'deposit')
  − SUM(project_transactions.amount WHERE account_id = id AND source    = 'manual')
```

**3. Automated allocation deposits carry no `account_id` and are excluded.**
Auto-allocation writes to `fund_transactions` / `project_transactions` with `account_id = NULL`. Those
rows never move a real wallet (they are internal redistributions of already-counted income), so the
balance query filters them out by virtue of `account_id = id` matching nothing. Legacy rows created
before this slice are likewise `NULL` and excluded — by design (see decision 7).

**4. `account_id` is nullable everywhere it is added.**
Every existing row (expenses, income, fund/project transactions logged before VS-18) keeps `account_id =
NULL`. The picker is *optional* on every screen; a null account simply means "unattributed", and such
rows contribute to no wallet balance. This keeps migration 019 a pure additive ALTER with zero backfill
risk and lets the feature ship without forcing the user to reclassify history.

**5. New tables and columns must join the sync layer (not in the KANBAN spec — flagged here).**
VS-15 / migration 017 added `uuid`, `updated_at`, `sync_status` + dirty-marking triggers to every
financial table, driven by the `SYNCED_TABLES` list. `accounts` and `transfers` are financial data and
**must** be added to `SYNCED_TABLES` with their `DATA_COLUMNS`, or they will silently never sync.
The new `account_id` columns on `expenses` / `income` / `fund_transactions` / `project_transactions`
also need to be added to those tables' `DATA_COLUMNS` arrays so that *re-attributing* an existing row to
an account marks it pending. Because `account_id` is a foreign key, the sync engine must map it
local-id ↔ uuid like every other FK. **This is the riskiest part of the slice** and is called out as its
own work item (§9) rather than buried in the migration. If full sync wiring is judged too large for this
slice, the fallback is to add `accounts`/`transfers` to `SYNCED_TABLES` but defer the FK-mapping for
`account_id` to a follow-up — documented explicitly, not left ambiguous.

**6. `setDefaultAccount` is exactly-one-default.**
Setting a new default clears the previous default in the same transaction (`UPDATE accounts SET
is_default = 0` then set the target to 1). The seed gives `Cash` the initial default. Hiding the default
account does not auto-promote another — the pickers fall back to "no selection" and the user picks
explicitly. (Edge case noted in Out of Scope.)

**7. `hideAccount` is a soft-delete; history is preserved.**
`hideAccount(id)` sets `is_active = 0`. The account vanishes from `getAccounts`, the overview, and every
picker, but its `account_id` references on past transactions remain intact, so historical balances and
account detail history still resolve. We never hard-delete an account that has transactions.

**8. Screens use Ionicons, consistent with the existing icon usage in this codebase.**
KANBAN specifies Ionicons names (`cash-outline`, `phone-portrait-outline`, `business-outline`,
`card-outline`). A single `ACCOUNT_TYPE_ICON` map in the feature keeps the type→icon mapping in one place
for `AccountsOverview`, `AccountPicker`, and `AccountDetail`.

**9. `AccountDetailRoute` / route wrappers follow the VS-17 `ExpenseDetailRoute` pattern exactly.**
The thin `app/` route renders only the feature's Route wrapper; the wrapper reads + validates
`useLocalSearchParams` and renders the screen. No `expo-router` param parsing leaks into `app/` beyond
the one-line default export.

---

## §0. Architecture Changes (do first — gates `/check-arch`)

Add the new approved cross-feature edges to **both** `docs/ARCHITECTURE.md` and the root `CLAUDE.md`
"Approved Cross-Feature Dependencies" list:

- `expenses`  → reads from `accounts` (AccountPicker in ExpenseLogScreen + ExpenseDetailScreen)
- `income`    → reads from `accounts` (AccountPicker in IncomeLogScreen)
- `funds`     → reads from `accounts` (AccountPicker in FundDetail manual deposit)
- `projects`  → reads from `accounts` (AccountPicker in ProjectDetail manual contribution)
- `dashboard` → reads from `accounts` (Wallets summary section)

`accounts` itself imports only shared infra — it must **not** import back from `expenses`/`income`/etc.
The balance query reads those tables by raw SQL through `@/services/database`, not by importing their
services, so no reverse edge is created.

---

## Problem Statement

Today every transaction is account-agnostic: an expense, an income, a fund deposit just exists, with no
notion of *which* wallet the money came from or went to. A user in this market juggles physical cash,
MTN MoMo, Orange Money, and a bank account — and cannot see how much is in each, nor move money between
them. There is no transfer concept at all.

VS-18 introduces Accounts (payment channels) with live computed balances, an optional account picker on
every money-movement screen, account-to-account transfers surfaced in the unified feed, and a per-account
transaction history. The Dashboard gains a Wallets summary.

---

## User Stories

- **As the user,** I see a Wallets section on the Dashboard with the live balance of each account.
- **As the user,** I can open Accounts to see every wallet's balance, purpose, and this month's income %
  and expense %.
- **As the user,** I can add a new account (name, type, purpose, optional current balance, set-default).
- **As the user,** I can tap an account to see its full transaction history (credits, debits, transfers,
  manual fund/project contributions out).
- **As the user,** I can edit or hide an account without losing its history.
- **As the user,** when logging an expense, income, fund deposit, or project contribution I can pick the
  source account, pre-filled with my default.
- **As the user,** I can log a transfer between two accounts from the Transactions FAB; it appears in the
  feed with a `⇄` icon and adjusts both balances.
- **As the user,** automated allocation deposits do not change any wallet balance.

---

## Scope

Files listed in **TDD order** — migrations and types first, then service (tested against in-memory
SQLite), hooks, then screens, then the edits to existing consumers.

---

### 1. Migrations — `src/services/migrations/`

Three new migrations, registered in `index.ts` (append to the `migrations` array in order).

**`018_create_accounts_table.ts`** (`id: 18`)

```sql
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('cash','mobile_money','bank','card')),
  purpose TEXT NOT NULL CHECK(purpose IN ('spending','saving','emergency','general')),
  opening_balance INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
```
Seed three rows (use a fixed `created_at` via the same timestamp helper other seeds use):
- `{ name: 'Cash',         type: 'cash',         purpose: 'spending', opening_balance: 0, is_default: 1 }`
- `{ name: 'MTN MoMo',     type: 'mobile_money', purpose: 'general',  opening_balance: 0, is_default: 0 }`
- `{ name: 'Orange Money', type: 'mobile_money', purpose: 'general',  opening_balance: 0, is_default: 0 }`

**`019_add_account_id_columns.ts`** (`id: 19`) — additive, nullable FK on four tables:

```sql
ALTER TABLE expenses             ADD COLUMN account_id INTEGER REFERENCES accounts(id);
ALTER TABLE income               ADD COLUMN account_id INTEGER REFERENCES accounts(id);
ALTER TABLE fund_transactions    ADD COLUMN account_id INTEGER REFERENCES accounts(id);
ALTER TABLE project_transactions ADD COLUMN account_id INTEGER REFERENCES accounts(id);
```
Optional supporting indexes for the balance query: `idx_expenses_account_id`, `idx_income_account_id`,
`idx_fund_tx_account_id`, `idx_project_tx_account_id`.

**`020_create_transfers_table.ts`** (`id: 20`)

```sql
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_account_id INTEGER NOT NULL REFERENCES accounts(id),
  to_account_id   INTEGER NOT NULL REFERENCES accounts(id),
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to   ON transfers(to_account_id);
```

> ⚠️ Sync wiring for these tables/columns is migration-021-or-code in §9 — keep it out of these three
> structural migrations so the schema change stays reviewable on its own.

---

### 2. Types — `src/features/finance/accounts/accounts.types.ts` (new)

```ts
export type AccountType = 'cash' | 'mobile_money' | 'bank' | 'card';
export type AccountPurpose = 'spending' | 'saving' | 'emergency' | 'general';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  purpose: AccountPurpose;
  openingBalance: number;   // FCFA integer
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;        // ISO 8601
}

export interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;           // FCFA integer, > 0
  date: string;             // YYYY-MM-DD
  note: string | null;
  createdAt: string;
}

export interface AccountStats {
  accountId: number;
  monthISO: string;         // YYYY-MM
  totalIncome: number;
  totalExpenses: number;
  incomePercent: number;    // 0–100, share of all accounts' income this month
  expensePercent: number;   // 0–100, share of all accounts' expense this month
}

/** Account-creatable fields (everything the form collects). */
export type NewAccountFields = Pick<Account, 'name' | 'type' | 'purpose'> & {
  openingBalance?: number;  // defaults to 0
  isDefault?: boolean;
};
```

---

### 3. Service — `src/features/finance/accounts/accounts.service.ts` (new)

Each exported function carries a JSDoc. No `any`. File ≤ 300 lines (split a `accounts.balance.ts` helper
out if the balance SQL pushes it over).

```ts
getAccounts(): Promise<Account[]>                       // is_active = 1, default first then name
getAccountById(id: number): Promise<Account | null>
createAccount(fields: NewAccountFields): Promise<Account>
updateAccount(id: number, fields: Partial<NewAccountFields>): Promise<void>
hideAccount(id: number): Promise<void>                  // is_active = 0
setDefaultAccount(id: number): Promise<void>            // clears prior default first
getAccountBalance(id: number): Promise<number>          // computed; see Scope Decision 2
getAccountStats(id: number, monthISO: string): Promise<AccountStats>
logTransfer(fromId: number, toId: number, amount: number, date: string, note?: string): Promise<Transfer>
getTransfers(monthISO: string): Promise<Transfer[]>
```

**Implementation notes:**
- `createAccount`: validate `name` non-empty, `openingBalance` a non-negative integer (default 0). If
  `isDefault`, clear other defaults in the same write path (reuse `setDefaultAccount`'s clear step).
- `setDefaultAccount`: `UPDATE accounts SET is_default = 0 WHERE is_default = 1`, then `... SET is_default
  = 1 WHERE id = ?`. Wrap both in a transaction so there is never zero-or-two defaults.
- `getAccountBalance`: one query per source table (or a single `UNION ALL` sub-select sum), following the
  formula in Scope Decision 2. `project_transactions` manual contributions are identified by `source =
  'manual'` (verify the exact column/enum against `013_create_project_transactions_table` + the projects
  service — adjust if the schema names it differently). Same for `fund_transactions.direction =
  'deposit'`.
- `getAccountStats`: `totalIncome`/`totalExpenses` for this account in `monthISO` (date LIKE
  `${monthISO}%`), divided by the all-accounts month totals to get percentages. Guard divide-by-zero →
  0%.
- `logTransfer`: reject `fromId === toId`, reject `amount <= 0`, insert one `transfers` row, return it.
- `getTransfers`: rows where `date LIKE ${monthISO}%`, newest first.

---

### 4. Hooks — `src/features/finance/accounts/accounts.hooks.ts` (new)

```ts
useAccounts(): { accounts: Account[]; balances: Record<number, number>; loading; error; refresh }
useAccountDetail(id): { account; balance; history; loading; error }
useAccountStats(id, monthISO): { stats: AccountStats | null; loading; error }
useTransferLog(): { /* from, to, amount, date, note setters; canSubmit; submit(): Promise<boolean>; error */ }
```
- `useAccounts` fetches accounts then resolves each balance (`Promise.all` over `getAccountBalance`) so
  the overview and the Dashboard Wallets section render balances without N round-trips at the component
  level.
- `useAccountDetail` builds the merged, date-sorted `history` (see §6 AccountDetail).
- `useTransferLog` defaults `from` to the `is_default` account, `date` to today; `canSubmit` requires
  both accounts set, distinct, and `amount > 0`.

---

### 5. `AccountPicker.tsx` (new — the most-reused component)

Modal listing active accounts, each with its type icon and a `✓ Default` marker on the default row.

```tsx
interface AccountPickerProps {
  value: number | null;
  onChange: (id: number) => void;
  label?: string;          // e.g. "From which account?"
}
```
Renders from `useAccounts()`; hidden accounts never appear. Built before its consumers so the consumer
edits in §10 can import a finished component.

---

### 6. Screens (new)

- **`AccountsOverview.tsx`** — one card per active account: name, type icon, computed balance, purpose
  badge, this-month income % + expense %. "Add account" button → `/accounts/create`. Tap card →
  `/accounts/[id]`.
- **`AccountDetail.tsx`** + **`AccountDetailRoute.tsx`** — balance hero, stats row, scrollable history
  filtered to this account: income credits (+), expense debits (−), transfers in (+) / out (−), manual
  fund contributions out (−), manual project contributions out (−). Each entry: type icon, label,
  signed amount, date. Edit button → `AccountForm` (edit mode). Route wrapper mirrors
  `ExpenseDetailRoute` (validate id, else "Invalid account id.").
- **`AccountForm.tsx`** — name (required), type picker (icons), purpose picker, optional opening-balance
  input labelled *"Current balance — leave blank to start from 0"*, set-as-default toggle. Drives both
  create (`createAccount`) and edit (`updateAccount` + `setDefaultAccount` when the toggle flips on).
- **`TransferLogScreen.tsx`** — from-picker (defaults to default account), to-picker, amount, date
  (today), optional note. Validates `from ≠ to` and `amount > 0`; on save calls `logTransfer` and
  `router.back()`.

---

### 7. Routes — `src/app/` (thin, new)

- `app/accounts/index.tsx`  → `<AccountsOverview />`
- `app/accounts/[id].tsx`   → `<AccountDetailRoute />`
- `app/accounts/create.tsx` → `<AccountForm />` (create mode)
- `app/transfers/log.tsx`   → `<TransferLogScreen />`

Each is a one-line default export; no logic, matching `app/expenses/[id].tsx` from VS-17.

---

### 8. Unified feed — `src/services/transactions.ts` + `TransactionList.tsx`

- `services/transactions.ts` (`getTransactionFeed`): extend to `LEFT JOIN`/`UNION` transfers into the
  feed. Extend the `TransactionEntry` union with
  `TransferEntry = { type: 'transfer'; id; fromAccountName; toAccountName; amount; date }`. Join account
  names for expense/income rows so the list can show the account chip.
- `TransactionList.tsx`: transfer rows render `⇄` + `"Cash → MTN MoMo"` + amount. Expense and income
  rows gain a small account-name chip, **omitted when `account_id` is null** (legacy rows). Transfer rows
  are non-tappable in this slice (no transfer edit yet — Out of Scope).

---

### 9. Sync wiring (Scope Decision 5 — own work item)

**Two parts — runtime constants (edit 017's exports) and schema (new migration 021).** Migration 017 has
already run on-device, so editing its `up()` body will not re-fire; the schema work must be a fresh
migration. The exported constants, however, are read live by the sync engine, so editing them is safe.

*Edit `017_add_sync_metadata.ts` exports (runtime, no re-run needed):*
- Add `'accounts'` and `'transfers'` to `SYNCED_TABLES`, **parents-first** — `accounts` before
  `transfers`, both before the child tables that reference them (confirm against the pull insert order in
  `@/services/sync`).
- Add `DATA_COLUMNS` entries for `accounts` and `transfers`.
- Append `'account_id'` to the `DATA_COLUMNS` arrays of `expenses`, `income`, `fund_transactions`,
  `project_transactions` (so the engine's column list and the recreated triggers agree).

*New `021_sync_accounts.ts` (`id: 21`) — schema:*
- Run the `addSyncColumns` mechanism for `accounts` and `transfers` (uuid/updated_at/sync_status columns,
  unique uuid index, sync_status index, insert + update dirty triggers, backfill existing seed rows).
- **Drop and recreate** the `trg_<t>_upd` AFTER-UPDATE triggers for `expenses`, `income`,
  `fund_transactions`, `project_transactions` so their `AFTER UPDATE OF <cols>` lists include
  `account_id` — otherwise re-attributing a row never marks it pending.

*FK mapping (`services/sync.mapping.ts`):* teach the id↔uuid round-trip about `expenses.account_id`,
`income.account_id`, `fund_transactions.account_id`, `project_transactions.account_id`,
`transfers.from_account_id`, `transfers.to_account_id`.

> If this exceeds the slice budget, ship `accounts`/`transfers` as synced tables and **explicitly defer**
> `account_id` FK mapping to a follow-up issue — do not leave it half-wired.

---

### 10. Edits to existing consumers

| File | Change |
|---|---|
| `expenses.service.ts` | `createExpense` + `updateExpense` accept optional `accountId`; store on row. |
| `income.service.ts` | `createIncome` accepts optional `accountId`. |
| `funds.service.ts` | manual deposit fn accepts optional `accountId` → `fund_transactions.account_id`. |
| `projects.service.ts` | `contributeManually` accepts optional `accountId` → `project_transactions.account_id`. |
| `ExpenseLogScreen.tsx`, `ExpenseDetailScreen.tsx` | add optional `AccountPicker` (defaults to default account); pass `accountId`. |
| `IncomeLogScreen.tsx` | add optional `AccountPicker` (defaults to default). |
| `QuickAddTemplateForm.tsx` | **no template-level account** (settled — see note); the account picker defaults at *log* time, not per template. |
| `FundDetail.tsx` | manual deposit section adds `AccountPicker` "From which account?". |
| `ProjectDetail.tsx` | manual contribution section adds `AccountPicker`. |
| `TransactionsScreen.tsx` | FAB — explicit mode: Quick Add \| Transfer \| **+ Log Expense**; speed-dial: Log Expense, Quick Add, Log Transfer. Transfer → `/transfers/log`. |
| `DashboardScreen.tsx` | compact **Wallets** section below budget summary: one row per active account (name + live balance); tap → `/accounts`. |

> **Settled:** Quick-Add templates do **not** store a per-template account. Adding `account_id` to
> `quick_add_templates` would mean a 5th ALTER, a sync `DATA_COLUMNS` change, and another FK to map — all
> to encode a default that the user can already set at log time. Instead, when a template is logged the
> resulting expense's `AccountPicker` defaults to the `is_default` account, exactly like a normal expense.
> No schema change, no `QuickAddTemplateForm` field. Revisit only if per-template accounts are explicitly
> requested later (Out of Scope below).

---

## TDD Anchors

All tests written **failing first**. Service tests use an in-memory SQLite instance (no SQLite mocking).

### `accounts.service.test.ts`
1. Migration seeds `Cash`, `MTN MoMo`, `Orange Money` with the specified types/purposes; `Cash` is default.
2. `getAccountBalance` sums income credits, expense debits, transfers in/out, manual fund deposits, and
   manual project contributions correctly.
3. `getAccountBalance` **excludes** automated allocation deposits (null `account_id` rows) and legacy
   null-account rows.
4. `getAccountBalance` reflects `opening_balance` as the starting figure.
5. `logTransfer` creates the row; rejects `fromId === toId`; rejects `amount <= 0`.
6. Transfer correctly debits `from` and credits `to` in subsequent balance reads.
7. `getAccountStats` returns correct income/expense percentages for a month with multiple active accounts;
   0% when month totals are zero.
8. `setDefaultAccount` clears the previous default before setting the new one (exactly one default).
9. `hideAccount` removes the account from `getAccounts` but keeps its transaction history resolvable.
10. `createAccount` defaults `openingBalance` to 0 when omitted; rejects empty name.

### `accounts.hooks.test.ts`
- `useAccounts` returns accounts + a balance map; excludes hidden.
- `useTransferLog` defaults `from` to the default account; `canSubmit` false when accounts equal or amount ≤ 0; `submit` calls `logTransfer` and returns true.
- `useAccountDetail` builds a date-sorted, account-filtered history.

### Component tests (RNTL)
- `AccountsOverview` — renders active accounts with balance + purpose badge; hidden absent; "Add account" → `/accounts/create`; card tap → `/accounts/[id]`.
- `AccountDetail` — renders balance + stats; shows this account's income/expense/transfer/fund/project entries only; edit → `AccountForm` edit mode.
- `AccountForm` — name required; type/purpose pickers persist; blank balance → 0; default toggle calls `setDefaultAccount`; create→`createAccount`, edit→`updateAccount`.
- `AccountPicker` — lists active accounts with type icons; default shows `✓ Default`; select fires `onChange(id)`; hidden not listed.
- `TransferLogScreen` — pickers required; same account both sides → validation error; amount > 0; save calls `logTransfer` with correct params + navigates back.
- `TransactionList` — transfer entries render `⇄` + `from → to`; expense rows with non-null `account_id` show chip; null `account_id` (legacy) render without chip.
- `DashboardScreen` Wallets — one row per active account; balance reflects mock service; tap → `/accounts`.

---

## Acceptance Check (Done When)

- Dashboard shows a Wallets section with live balance per account.
- AccountsOverview shows income % and expense % per account for the current month plus purpose badges.
- Tapping an account shows its full transaction history.
- Transfers logged from the Transactions FAB (explicit + speed-dial), appear in the feed with `⇄`, and
  adjust both account balances.
- Expense, income, manual fund deposit, and project contribution screens have an optional account picker
  pre-filled with the default account.
- Automated allocation deposits do not affect any account balance.
- `accounts` and `transfers` participate in cloud sync (or FK-mapping deferral is documented per §9).
- `npm test` — all new and existing tests green.
- `/check-arch` clean — only the five new approved edges in §0 appear; `accounts` imports no feature.

---

## Out of Scope (Not in VS-18)

- Editing or deleting a transfer (transfer rows non-tappable this slice).
- Editing/deleting income (still deferred from VS-17).
- Auto-promoting a new default when the default account is hidden (user re-selects).
- Per-account budgets or per-account allocation rules.
- Multi-currency (FCFA only, per project constraint).
- Account reconciliation / statement import.
- Hard-deleting an account with history.
- Per-template default accounts on Quick-Add (settled in §10 — defaults at log time instead).
