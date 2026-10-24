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
| **Debt outstanding** | What is still owed on a pending debt: its repayable total (total to repay, else the amount) less its live repayments. Settled debts owe nothing | Today (VS-44; total to repay VS-54) | `debt.service` (`outstanding`) |
| **Total to repay** | What a borrower pays back in all, interest and fees included — typed by the user instead of a rate. Its excess over the amount is the loan's cost (or, for a loan given, its earnings) | Today (VS-54) | `debt.terms.loanCost` |
| **Instalment** | One of a debt's equal scheduled repayments (weekly or monthly from a first date); ticking it records a repayment of exactly that amount | Today (VS-54) | `debt.terms.buildInstalments` |
| **Repayment** | Money paid back on a debt, through an account or none. Moves account balances; never income or spending | Today (VS-44) | `debt.payments` |
| **Refund** | Money back for a purchase: a negative expense row linked to it, in its category, dated when the money came back. Lowers that month's spending; never income | Today (VS-45) | `expenses.refunds` |
| **Cash on hand** | Sum of all active wallet balances. Shown on the Budget tab for the current month only; never mixed into the budget | Today (VS-47) | `accounts.balance.getCashOnHand` |
| **Month income** | Income dated in the month, all sources and wallets | Today | `budget.service.getIncomeMonthlyTotal` |
| **Month spend** | Expenses dated in the month. Transfers are never spend | Today | `budget.service.getExpensesMonthlyTotal` |
| **Fixed spend** (budget pace) | The recurring (auto-logged) part of month spend. Projected once, never extrapolated | Today (VS-40) | `budget.envelopes.getFixedSpendByCategory` |
| **Fixed / variable cost** | A category's tag: a commitment (rent, school fees) or spending a habit can change (food, taxi). Untagged parent = variable; untagged subcategory inherits | Today (VS-41) | `expenses.costType` |
| **Logged day** | A day with at least one expense or a confirmed zero-spend day | Today (VS-41) | `expenses.coverage.getLoggedDates` |
| **Missed day** | A day in the last 7 before today, on or after the first day ever logged, with neither an expense nor a no-spend day. It can be marked as a no-spend day; a day with spending never can | Today (UX-06) | `expenses.coverage.missedDays`, `journey.logging.getObserveLogging` |
| **Complete month** | A month with ≥ 80% logged days. Only complete months feed averages | Today (VS-41) | `expenses.coverage.monthCoverage` |
| **Typical month** | The average of the complete months among the last three before this one, split fixed / variable / unexpected. An imprévu is unexpected; a recurring bill is fixed; otherwise the category tag decides | Today (VS-41) | `reports.profile.getSpendingProfile` |
| **Budget total** | The month's spending plan: the explicit total if set, else expected income, else month income | Today (expected income since VS-47) | `budget.plan.buildMonthlyPlan` |
| **Unbudgeted income** | Income received beyond the budget total. Never raises the budget by itself: the user adds it to the budget or leaves it unassigned ("give it a job") | Today (VS-47) | `buildMonthlyPlan` (`unbudgetedIncome`), `budget.cashflow` |
| **Envelope** | One category's budget for one month | Today | `category_budgets` |
| **Set aside (goals)** | The month's goal monthly amounts, taken out of the budget total first — pay yourself first | Today (VS-49) | `budget.goals.getGoalSetAside` |
| **Spendable** | Budget total − set aside, never below zero. What the envelopes share and spending is measured against | Today (VS-49) | `buildMonthlyPlan` |
| **Available (budget)** | Spendable + rollover carried in. This is what the Budget tab and the Dashboard both measure against | Today | `budget.plan.getBudgetOverview` |
| **Budget remaining** | Available − month spend. **A plan figure, not money.** It says nothing about what is in the wallets | Today | same |
| **Budget health** | `on_track` / `at_risk` / `over`, one rule for every screen. The Dashboard shows it as green/yellow/red | Today (unified in VS-40) | `budget.progress.budgetHealth` |
| **Projected spend** | Fixed spend + variable spend at the daily run-rate, to month end | Today (VS-40) | `budget.progress.projectSpend` |
| **Unassigned** | Spendable − sum of envelopes | Today (spendable since VS-49) | `buildMonthlyPlan` |
| **Imprévu** | An expense flagged as unexpected. A flag, not a category | Today | `expenses.is_unplanned` |
| **Committed money** | What is already promised before the month ends: recurring bills still to log, open planned purchases due, what is still owed on debts due (for a debt with instalments, only its unpaid instalments due), and unpaid tontine contributions due (overdue included). Shown beside budget and cash, never subtracted from either | Today (VS-47; tontines VS-52) | `budget.committed.getCommitted` |
| **Goal cash** | Cash in the wallets of live goals. Part of cash on hand, but promised to a goal | Today (VS-49) | `budget.goals.getGoalCash` |
| **Goal** | A starter buffer or a sinking fund, linked to one wallet. Its progress is that wallet's balance; saving is a transfer into it. One live goal per wallet | Today (VS-48) | `goals.service.getGoals` |
| **Sinking fund** | A goal for a known cost on a date. Needs `ceil(remaining / months left)` a month, months counted up to (not including) the target month | Today (VS-48) | `goals.progress.goalProgress` |
| **Starter buffer** | A goal with no date: a cushion for surprises, suggested at one month of essentials | Today (VS-48) | same |
| **Essential spending** (one month) | The fixed part of a typical month, averaged over complete months (imprévus excluded, recurring bills counted); else the user's essentials estimate | Today (VS-50) | `goals.reserve.getEssentialMonthly`, `expenses.essentials` |
| **Tontine** | A rotating savings group: every cycle each member pays the contribution, one member takes the pot (`contribution × members`). As many cycles as members. Its money is never spending or income — contributions and the payout only move wallets | Today (VS-51) | `tontines.service` |
| **Tontine position** | Paid in − received. Positive: the group owes the user (before their turn). Negative: the user still owes it in contributions | Today (VS-51) | `tontines.schedule.summarise` |
| **Emergency reserve** | A goal sized as N months (1–12) of essential spending; re-sized as real months are logged; provisional below 3 complete months | Today (VS-50) | `goals.service.getGoals` |
| **Earmark** | Money assigned to a goal. Decided 2026-10-17: never virtual — a goal's money is its wallet (see Goal) | Superseded by Goal (VS-48) | — |
| **Safe to spend** | Cash on hand − goal cash − committed money. Budget tab only; may be negative, said in words | Today (VS-49) | `budget.cashflow.hooks.useCashflow` |
| **Expected income** | Income the user anticipates but has not received: the typical-income estimate in force when the month ended (a later estimate never rewrites a closed month). Sizes the default budget; never counted as cash or as income in | Today (VS-47) | `budget.cashflow.getExpectedIncome` |
| **Observed vs estimated** | Observed = derived from logged transactions over complete months. Estimated = typed by the user. Never silently merged: the user may adopt an observed figure, which is then recorded as observed | Today (VS-46) | `budget.baseline`, `reports.EstimateVsActualCard` |
| **Baseline fact** | One answer about the user's money (income, regular or not, pay day, essentials, checklist answers). Append-only; latest per kind wins | Today (VS-46) | `budget.baseline` |
| **Provisional** | A figure based on fewer than 3 complete months. Shown, labelled, never presented as settled | Today (VS-46) | `countCompleteMonths` |
| **Net worth** | Money only (user decision): active wallets + still lent out − still owed + tontine position, as of a day. Things owned (land, livestock, a business) are not counted yet | Today (VS-53) | `networth.compute.getNetWorthAsOf` |
| **Savings rate** | Share of a month's income kept: (income received − spending) ÷ income received, whole percent; negative when spending exceeded income; none without income | Today (VS-53) | `networth.compute.savingsRate` |
| **Month-end snapshot** | A closed month's net worth, its parts and its income and spending, stored once so later edits do not rewrite history. Append-only; latest per month wins; recalculated only on purpose | Today (VS-53) | `networth.snapshots` |
| **Usual month (category)** | A category's (or subcategory's) average spend over the complete months among the three before the month shown: the planner's window and rule. None until a month is complete. The running month is compared on its projection, a closed month on what was spent | Today (VS-56) | `budget.categoryDetail.getUsualSpend` |
| **Starting point** | What the user's first three complete months cost (fixed / variable / unexpected and per category), before any change. Fixed once recorded; the running month never counts. Set beside the typical month (the last three complete months) with a % change | Today (VS-58) | `reports.startingPoint.getStartingPoint` |
| **Event** | An occasion that causes spending (a wedding, a funeral, a trip), tagged on the expenses it caused across categories. One event per expense; refunds follow their purchase; no event budget yet. Its total is net spending tagged with it | Today (VS-61) | `events.service.getEvents` / `getEventDetail` |
| **Why (spending reason)** | Why an expense happened, one of four, in this order: **Event** (tagged with an occasion), **Unexpected** (imprévu), **Routine** (fixed: recurring bills, weekdays included, and fixed categories), **Everyday** (the rest, the habits the user can change). Shown on the Budget category detail and Reports | Today (VS-62) | `expenses.reason.reasonOf` |
| **Journey (my path)** | The five steps to control: **Observe** (3 complete months), **See** (read what they cost), **Plan** (a fully logged month with a budget), **Optimize** (a planned month under the starting point's variable spending), **Grow** (goals, reserve, net worth). Worked out from the data, never a mode; a passed step never locks again; the next step may be skipped to after a warning | Today (VS-63) | `journey.service.getJourney` |

## Visible labels (UX-01)

What the user reads for each term. One label per term, used on every screen; a term not listed
here keeps its own name in the UI.

| Term | English | French |
|---|---|---|
| Budget remaining | Left in your plan (over: *Over your plan by*) | Reste au budget (*Budget dépassé de*) |
| Safe to spend | Free cash | Argent libre |
| Safe daily spend (`safeDailySpend`) | A day to stay on plan | Par jour pour tenir le budget |
| Committed money | Due before month end | À payer d’ici fin du mois |
| Unassigned | … to share out | … à répartir |
| Unbudgeted income, left alone | Keep it aside | Les garder de côté |
| Projected spend | Heading for (≈ amount) | En route vers (≈ montant) |
| Budget total (Reports) | Budget | Budget |
| Month spend (Home, month without a plan) | Spent this month | Dépensé ce mois-ci |
| Budget health | On track · Watch out · Over budget | Dans les clous · Attention · Budget dépassé |
| Wallet (an `accounts` row) | Wallet — never "account", which means the cloud account | Portefeuille — jamais « compte » |
