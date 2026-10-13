# Finance Gatekeeper — Financial Logic Audit

Branch `main` @ `7713e8c`. All amounts are whole FCFA integers. Every validated write path
rejects values that are ≤ 0 or not integers (envelopes allow 0).

---

## 1. Who owns which number

| Figure | Owner | Stored or derived | Source |
|---|---|---|---|
| Wallet balance | `accounts` | **Derived** on every read | `accounts.balance.ts:17-33` |
| Month income | `budget` (direct SQL) | Derived | `budget.service.ts:79-85` |
| Month spend | `budget` (direct SQL) | Derived | `budget.service.ts:61-67` |
| Month spendable total | `budget` | `allocations.total_budget` if set, **else month income** | `budget.plan.ts:37-58` |
| Envelope (category budget) | `budget` | Stored `category_budgets.allocated_amount` | `budget.envelopes.ts:79-102` |
| Rollover carry | `budget` | **Derived** by replaying history | `budget.envelopes.ts:206-235`, `budget.progress.ts:200` |
| Debt outstanding | `debt` | Stored rows; totals derived | `debt.service.ts:132` |
| Imprévus | `expenses` | Flag on the expense row | `expenses.unplanned.ts:10` |

There is **no stored or derived figure** for any of these: total cash on hand, net worth,
savings, reserved/committed money, expected income, or average monthly spend overall.

---

## 2. Formulas as implemented (verified)

```
walletBalance(a) = opening_balance(a)                       -- undated
                 + Σ income.amount   where account_id = a
                 − Σ expenses.amount where account_id = a
                 + Σ transfers in − Σ transfers out
                 − Σ legacy fund deposits / manual project contributions (parked tables)

monthIncome(m)   = Σ income.amount   where date LIKE 'm-%'   (all sources, all wallets, incl. NULL wallet)
monthSpend(m)    = Σ expenses.amount where date LIKE 'm-%'

totalBudget(m)   = allocations.total_budget(m) ?? monthIncome(m)
available(m)     = totalBudget(m) + Σ carriedIn(m, c)       (rollover envelopes only)
remaining(m)     = available(m) − monthSpend(m)
unassigned(m)    = totalBudget(m) − Σ envelope(m, c)

carriedIn(m+1,c) = rollover(m+1,c) ? envelope(m,c) + carriedIn(m,c) − spend(m,c) : 0

projected        = (spent / daysElapsed) × daysInMonth      -- linear run-rate
health           = over      if spent > available
                   at_risk   if projected > available, or consumed ≥ 80% with days left
                   on_track  otherwise
safeDailySpend   = max(0, remaining) / max(1, daysRemaining)

dashboard.pace   = red if spent > budget; yellow if 75–99% with days left; else green
dashboard.net    = monthIncome − monthSpend

suggestFromHistory(c) = Σ spend(c) over prev 3 months / (# of those months with spend(c) > 0)
```

Transfers are kept apart from income and expenses: their own table, and no month totals read
them. This is **verified** (`transactions.ts`, `budget.service.ts`). Transfers do not inflate
income or spending.

---

## 3. Business rules: current vs missing

| Rule | Current | Missing |
|---|---|---|
| Spending warnings | Category and month checks before saving; warn only, never block | Checks do not use the expense's own month (see §4.2) |
| Envelope edits | Free at any time; `moveBudget` keeps the total unchanged | — |
| Income | Counts immediately and in full toward the month budget | Expected vs received; earmarking; smoothing |
| Recurring | Auto-logs each overdue occurrence on its due date | A wallet; annual/quarterly frequency; projection of upcoming occurrences |
| Planned purchases | Do **not** affect the budget until bought (KANBAN VS-36) | Reserving money for an upcoming purchase |
| Debt | Settle in one step; edits allowed | Partial payment, interest, schedule, wallet movement |
| Deletion | Hard delete, local only | Sync tombstones (documented limitation) |

---

## 4. Defects and inconsistencies, ordered by severity

### 4.1 HIGH — Recurring and quick-add expenses never debit a wallet (verified)

- `runRecurringAutoLog` inserts expenses **without `account_id`**
  (`expenses.service.ts:668-678`).
- `logFromQuickAddTemplate` calls `createExpense` with no `accountId`
  (`expenses.service.ts:495-512`). The template table has no account column (mig. 006).
- `getAccountBalance` ignores rows with NULL `account_id` (`accounts.balance.ts:10-16`).

**Consequence:** rent, data bundles and the daily taxi (the most frequent and largest
expenses) are counted in the budget but **not** in wallet balances. Wallets overstate cash,
and the gap grows every month. This must be fixed before any feature uses wallet balances as
"real money" (buffers, emergency coverage, net worth).

### 4.2 MEDIUM — Over-budget checks use the wrong month or the wrong amount (verified)

- On edit, the month-wide check is called with the **full new amount**, `check(newAmount)`
  (`ExpenseDetailScreen.tsx:78`). Month spend already includes the old amount, so the old
  amount is counted twice. Raising 10,000 to 12,000 is tested as +12,000 instead of +2,000,
  which produces **false over-budget warnings**. The category check correctly uses the increase
  (`:67-69`), so the two checks disagree.
- Both hooks default to the **current** month (`budget.hooks.ts:47-48`,
  `budget.envelope.hooks.ts:105-106`). Neither the edit screen nor the log screen passes the
  expense's month (`ExpenseDetailScreen.tsx:43-44`, `ExpenseEntryPanel.tsx:57-58`). A
  back-dated expense from last month is checked against this month's budget.
- Changing an expense's category without changing its amount runs no envelope check.

### 4.3 MEDIUM — "Use my averages" inflates irregular categories (verified)

`suggestFromHistory` divides by **the months in which the category had spend**
(`budget.plan.ts:166-180`), not by the months observed. Example: one annual 120,000 insurance
payment in 3 months becomes a suggested **120,000 every month**. It also:
- treats a partial first month (the user installed on the 20th) as a full month;
- cannot tell a real zero-spend month from a month the user did not log;
- includes one-off purchases and imprévus with no way to exclude them.

The design rationale in the comment (not halving the suggestion for new users) is sound for
regular categories and wrong for lumpy ones.

### 4.4 MEDIUM — The default budget is "income logged so far" (verified)

`totalBudget = total_budget ?? monthIncome` (`budget.plan.ts:46`, `budget.service.ts:97-110`).
- For a salaried user paid on the 25th, the budget for days 1–24 is 0 (or last month's
  carried figure, if any). `checkOverBudget` stays **silent** while the budget is ≤ 0
  (`budget.plan.ts:207-209`), so the first three weeks get no guidance at all.
- Every freelance payment immediately raises the spendable budget by 100% of its value. This
  is the "income inflates the budget" problem VS-19 was created to fix, and it came back when
  VS-34 parked the pool.
- The budget treats income as fully spendable, with nothing reserved for savings or
  obligations.
- The planner still labels this figure "**income split**": `planner.followingIncome` /
  `useIncome` in `i18n/locales/en/budget.ts:65-66`. No split exists any more.

### 4.5 MEDIUM — Debts are disconnected from money (verified)

`debts` has no `account_id`. `settleDebt` only flips the status (`debt.service.ts:95-103`). If
the user lends 50,000 from MoMo, the MoMo balance does not move. To make it move, the user
must also log an expense, which then **inflates spending and the averages**. Repayments
received have the same problem with income: there is no income source for them. There is
also no partial repayment; the only way to record one is to edit the amount, which erases
the history.

### 4.6 LOW–MEDIUM — Two different "health" verdicts (verified)

The Budget tab uses a pace projection plus an 80% rule (`budget.progress.ts:89`). The
dashboard uses a flat 75% rule (`dashboard.service.ts:24-28`). The same month can show "at
risk" on Budget and green on the Dashboard.

### 4.7 LOW–MEDIUM — Linear projection penalises lumpy spending (verified, design risk)

`projectSpend` extrapolates `spent / daysElapsed`. Rent auto-logged on the 1st projects about
30× rent for the month, so the month and the Bills envelope read **at_risk** for days. Fixed
costs need to be excluded from the run-rate, or projected separately.

### 4.8 LOW — The carry chain skips months without an envelope row (verified, untested edge)

`getCarriedIn` builds the history only from months that **have** a `category_budgets` row
(`budget.envelopes.ts:215-230`). Take a month with no row but with spending in that category,
between two rollover months. Its spending is ignored, and the carry jumps over it.

### 4.9 LOW — Report debt summary is not historical (verified)

`getMonthlyReport` uses `getOutstandingTotals()` with no date (`reports.service.ts:224, 252`).
Viewing March shows today's debts.

### 4.10 LOW — Balances cannot be reconciled or corrected (verified)

- `opening_balance` has no date. If the user enters today's balance and then back-logs older
  income or expenses into that wallet, those amounts are counted twice.
- Transfers cannot be edited or deleted (`accounts.service.ts`: only `logTransfer` and
  `getTransfers`).
- There is no "my MoMo actually shows X" adjustment entry.
- Legacy parked fund deposits still subtract from balances, but parked fund **withdrawals**
  were never credited back, and the parked `withdrawFromFund` takes no wallet. A wallet that
  ever funded the emergency fund stays permanently understated by the amount withdrawn.

### 4.11 LOW — No refunds or reversals

Amounts must be > 0 everywhere. A refund can only be handled by editing or deleting the
original expense, or by logging it as income, which inflates income.

### 4.12 Known and documented — deletions are not synced

A deleted expense, income or debt stays in the cloud copy and **comes back after a cloud
restore** (`income.service.ts:116-122`, `docs/CLOUD-SYNC.md:138-177`). History-based figures
(averages, carry) can change after a restore.

---

## 5. Prompt checklist: which risks exist today

| Risk | Present? |
|---|---|
| Double-counting income/transfers/savings | Transfers: **no**. Opening balance plus back-logged rows: **yes** (§4.10). Debt logged both as debt and as expense: **user-driven yes** (§4.5) |
| Allocations confused with balances | Not on `main` (no allocations). **It was a real risk in the parked design**: automated fund deposits had a NULL wallet, so fund totals were logical while wallet balances were physical. Any revival must settle this first |
| Spending committed money | **Yes.** Nothing reserves recurring or planned amounts (§3) |
| Estimate treated as confirmed cash | No estimates exist. Instead, actual income is treated as *fully spendable* (§4.4) |
| Averages from incomplete months | **Yes** (§4.3) |
| Annual expenses ignored | **Yes.** Recurring supports monthly/weekly only; averages distort lumpy costs |
| Tontine/family support as debt | No concept exists, so the user must choose debt or expense, and either is wrong for a tontine |
| Investing before cash needs | N/A, no investing |
| Emergency vs sinking funds interchangeable | N/A on `main`. Parked design had only `emergency` and `savings` |
| Goal complete on plans only | N/A |
| History lost on goal or circumstance change | Envelopes are per-month rows, so they are kept. Debts are **edited in place** (amount overwritten). Recurring templates are hard-deleted, but their logged expenses survive |
