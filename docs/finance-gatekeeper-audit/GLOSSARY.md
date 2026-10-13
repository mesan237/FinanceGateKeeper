# Finance Gatekeeper — Financial Terms

One meaning per term. Code, copy and docs must not use these interchangeably.
"Today" marks what the code computes on `feat/vs-40-financial-integrity`; "Planned"
marks terms reserved for later phases. Planned terms must not appear in UI copy until they
are implemented.

| Term | Meaning | Status | Computed by |
|---|---|---|---|
| **Wallet balance** | Money physically in one wallet (cash, MoMo, bank), derived from that wallet's history and opening balance | Today, but overstated: recurring and quick-add expenses carry no wallet yet (Phase 1b) | `accounts.balance.getAccountBalance` |
| **Cash on hand** | Sum of all active wallet balances | Planned | — |
| **Month income** | Income dated in the month, all sources and wallets | Today | `budget.service.getIncomeMonthlyTotal` |
| **Month spend** | Expenses dated in the month. Transfers are never spend | Today | `budget.service.getExpensesMonthlyTotal` |
| **Fixed spend** (budget pace) | The recurring (auto-logged) part of month spend. Projected once, never extrapolated | Today (VS-40) | `budget.envelopes.getFixedSpendByCategory` |
| **Fixed / variable cost** | A category's tag: a commitment (rent, school fees) or spending a habit can change (food, taxi). Untagged parent = variable; untagged subcategory inherits | Today (VS-41) | `expenses.costType` |
| **Logged day** | A day with at least one expense or a confirmed zero-spend day | Today (VS-41) | `expenses.coverage.getLoggedDates` |
| **Complete month** | A month with ≥ 80% logged days. Only complete months feed averages | Today (VS-41) | `expenses.coverage.monthCoverage` |
| **Typical month** | The average of the complete months among the last three before this one, split fixed / variable / unexpected. An imprévu is unexpected; a recurring bill is fixed; otherwise the category tag decides | Today (VS-41) | `reports.profile.getSpendingProfile` |
| **Budget total** | The month's spending plan: the explicit total if set, else month income | Today | `budget.plan.buildMonthlyPlan` |
| **Envelope** | One category's budget for one month | Today | `category_budgets` |
| **Available (budget)** | Budget total + rollover carried in. This is what the Budget tab and the Dashboard both measure against | Today | `budget.plan.getBudgetOverview` |
| **Budget remaining** | Available − month spend. **A plan figure, not money.** It says nothing about what is in the wallets | Today | same |
| **Budget health** | `on_track` / `at_risk` / `over`, one rule for every screen. The Dashboard shows it as green/yellow/red | Today (unified in VS-40) | `budget.progress.budgetHealth` |
| **Projected spend** | Fixed spend + variable spend at the daily run-rate, to month end | Today (VS-40) | `budget.progress.projectSpend` |
| **Unassigned** | Budget total − sum of envelopes | Today | `buildMonthlyPlan` |
| **Imprévu** | An expense flagged as unexpected. A flag, not a category | Today | `expenses.is_unplanned` |
| **Reserved / committed money** | Cash set aside for known upcoming obligations (recurring, planned, debt due) | Planned (Phase 3–4) | — |
| **Earmark** | Money assigned to a goal (buffer, sinking fund, reserve). Virtual unless decided otherwise | Planned (Phase 4) | — |
| **Safe to spend** | Cash on hand − reserved − protected earmarks | Planned. Do not show before cash on hand is trustworthy | — |
| **Expected income** | Income the user anticipates but has not received. Never counted as cash | Planned (Phase 3) | — |
| **Observed vs estimated** | Observed = derived from logged transactions over complete, well-covered months. Estimated = typed by the user. They are never silently merged | Planned (Phase 2) | — |
| **Net worth** | Cash on hand + other assets − outstanding debts owed | Planned (Phase 6) | — |
