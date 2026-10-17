# Finance Gatekeeper — Financial Terms

One meaning per term. Code, copy and docs must not use these interchangeably.
"Today" marks what the code computes on `feat/vs-40-financial-integrity`; "Planned"
marks terms reserved for later phases. Planned terms must not appear in UI copy until they
are implemented.

| Term | Meaning | Status | Computed by |
|---|---|---|---|
| **Wallet balance** | Money physically in one wallet (cash, MoMo, bank): the latest balance check plus what happened after it, or — with no check — the opening balance plus the whole history | Today (VS-42: templates carry a wallet; checks pin the balance) | `accounts.balance.getAccountBalance` |
| **Balance check** | "This wallet actually holds X today." Pins the balance at a date; later entries move it, older back-logged ones do not. Records how far off the app was. Soft-deleted, never hard-deleted | Today (VS-42) | `accounts.checks` |
| **Unassigned spending** | Expenses with no wallet (legacy, or from a template without one). Left out of every wallet balance and shown as a count and total on Accounts | Today (VS-42) | `accounts.balance.getUnassignedSpending` |
| **Debt outstanding** | What is still owed on a pending debt: its amount less its live repayments. Settled debts owe nothing | Today (VS-44) | `debt.service` (`outstanding`) |
| **Repayment** | Money paid back on a debt, through an account or none. Moves account balances; never income or spending | Today (VS-44) | `debt.payments` |
| **Refund** | Money back for a purchase: a negative expense row linked to it, in its category, dated when the money came back. Lowers that month's spending; never income | Today (VS-45) | `expenses.refunds` |
| **Cash on hand** | Sum of all active wallet balances. Shown on the Budget tab for the current month only; never mixed into the budget | Today (VS-47) | `accounts.balance.getCashOnHand` |
| **Month income** | Income dated in the month, all sources and wallets | Today | `budget.service.getIncomeMonthlyTotal` |
| **Month spend** | Expenses dated in the month. Transfers are never spend | Today | `budget.service.getExpensesMonthlyTotal` |
| **Fixed spend** (budget pace) | The recurring (auto-logged) part of month spend. Projected once, never extrapolated | Today (VS-40) | `budget.envelopes.getFixedSpendByCategory` |
| **Fixed / variable cost** | A category's tag: a commitment (rent, school fees) or spending a habit can change (food, taxi). Untagged parent = variable; untagged subcategory inherits | Today (VS-41) | `expenses.costType` |
| **Logged day** | A day with at least one expense or a confirmed zero-spend day | Today (VS-41) | `expenses.coverage.getLoggedDates` |
| **Complete month** | A month with ≥ 80% logged days. Only complete months feed averages | Today (VS-41) | `expenses.coverage.monthCoverage` |
| **Typical month** | The average of the complete months among the last three before this one, split fixed / variable / unexpected. An imprévu is unexpected; a recurring bill is fixed; otherwise the category tag decides | Today (VS-41) | `reports.profile.getSpendingProfile` |
| **Budget total** | The month's spending plan: the explicit total if set, else expected income, else month income | Today (expected income since VS-47) | `budget.plan.buildMonthlyPlan` |
| **Unbudgeted income** | Income received beyond the budget total. Never raises the budget by itself: the user adds it to the budget or leaves it unassigned ("give it a job") | Today (VS-47) | `buildMonthlyPlan` (`unbudgetedIncome`), `budget.cashflow` |
| **Envelope** | One category's budget for one month | Today | `category_budgets` |
| **Available (budget)** | Budget total + rollover carried in. This is what the Budget tab and the Dashboard both measure against | Today | `budget.plan.getBudgetOverview` |
| **Budget remaining** | Available − month spend. **A plan figure, not money.** It says nothing about what is in the wallets | Today | same |
| **Budget health** | `on_track` / `at_risk` / `over`, one rule for every screen. The Dashboard shows it as green/yellow/red | Today (unified in VS-40) | `budget.progress.budgetHealth` |
| **Projected spend** | Fixed spend + variable spend at the daily run-rate, to month end | Today (VS-40) | `budget.progress.projectSpend` |
| **Unassigned** | Budget total − sum of envelopes | Today | `buildMonthlyPlan` |
| **Imprévu** | An expense flagged as unexpected. A flag, not a category | Today | `expenses.is_unplanned` |
| **Committed money** | What is already promised before the month ends: recurring bills still to log, open planned purchases due, and what is still owed on debts due (overdue included). Shown beside budget and cash, never subtracted from either | Today (VS-47) | `budget.committed.getCommitted` |
| **Reserved money** | Cash actually set aside for committed money or goals | Planned (Phase 4) | — |
| **Goal** | A starter buffer or a sinking fund, linked to one wallet. Its progress is that wallet's balance; saving is a transfer into it. One live goal per wallet | Today (VS-48) | `goals.service.getGoals` |
| **Sinking fund** | A goal for a known cost on a date. Needs `ceil(remaining / months left)` a month, months counted up to (not including) the target month | Today (VS-48) | `goals.progress.goalProgress` |
| **Starter buffer** | A goal with no date: a cushion for surprises, suggested at one month of essentials | Today (VS-48) | same |
| **Earmark** | Money assigned to a goal. Decided 2026-10-17: never virtual — a goal's money is its wallet (see Goal) | Superseded by Goal (VS-48) | — |
| **Safe to spend** | Cash on hand − reserved − protected earmarks | Planned. Do not show before cash on hand is trustworthy | — |
| **Expected income** | Income the user anticipates but has not received: the typical-income estimate in force when the month ended (a later estimate never rewrites a closed month). Sizes the default budget; never counted as cash or as income in | Today (VS-47) | `budget.cashflow.getExpectedIncome` |
| **Observed vs estimated** | Observed = derived from logged transactions over complete months. Estimated = typed by the user. Never silently merged: the user may adopt an observed figure, which is then recorded as observed | Today (VS-46) | `budget.baseline`, `reports.EstimateVsActualCard` |
| **Baseline fact** | One answer about the user's money (income, regular or not, pay day, essentials, checklist answers). Append-only; latest per kind wins | Today (VS-46) | `budget.baseline` |
| **Provisional** | A figure based on fewer than 3 complete months. Shown, labelled, never presented as settled | Today (VS-46) | `countCompleteMonths` |
| **Net worth** | Cash on hand + other assets − outstanding debts owed | Planned (Phase 6) | — |
