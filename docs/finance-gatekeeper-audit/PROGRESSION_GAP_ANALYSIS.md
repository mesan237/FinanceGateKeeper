# Finance Gatekeeper — Progression Gap Analysis

The six stages are a **conceptual model** for discussion. Nothing in the code implements
stages. Status references point to `CURRENT_STATE.md` (matrix #) and `FINANCIAL_LOGIC.md` (§).

---

## 1. The three-month observation concept

### 1.1 What history shows

The original concept has already been built once and removed. `PRODUCT DOCUMENT.md` §4
defined **Learning Mode (month 1)**, a period of observation only, followed by Control Mode.
VS-08 built the mode. VS-24 added a "switch to Control" nudge. VS-34 deleted it because:

- every install defaulted to `learning`, and budgeting was gated behind `control`, so
  **envelope budgeting was invisible to users from the day it shipped** (KANBAN §VS-34);
- the mode "gated nothing but its own Settings toggle".

So the failure was not observation itself. It was **observation implemented as hiding
features**, with no data product at the end of the period.

### 1.2 What exists today that an observation period could use (verified)

| Ingredient | Exists? | Evidence |
|---|---|---|
| Dated, categorised expenses | Yes | `expenses` |
| Dated income by source | Yes, 3 sources | `income` |
| Per-category, per-month spend | Yes | `getSpendByCategory` |
| 3-month per-category average | Yes, but biased (§4.3) | `suggestFromHistory` |
| "Did the user log today?" signal | Yes | `zero_days` + `hasExpensesOn` (`expenses.service.ts:777-818`) |
| Install / first-use date | Partly. `users.created_at` exists; the first transaction date can be queried | mig. 008 |
| Month completeness | **No** | — |
| One-off vs recurring vs irregular tags | Partly. `is_recurring`, `is_unplanned`; planned purchases are linked through `planned_items.expense_id` | — |
| Baseline facts (fixed bills, balances, debts) | **No** | onboarding collects nothing |

### 1.3 Assessment

- **Complete vs incomplete months.** Not distinguished today. The data needed is cheap. A
  month counts as "observed" when the user was active for it from day 1 (first-use date ≤ the
  1st), and a logging-coverage ratio can be computed as (days with an expense or a zero-day
  confirmation) / (days in the period). Both come from existing tables.
- **Mid-month starters.** The first month should be prorated, or excluded from averages. Today
  it counts as a full month in `suggestFromHistory`.
- **One-offs, annual bills, refunds, transfers.** Transfers are already excluded (good).
  One-offs and annual bills need either a per-expense "exceptional" flag or median/trimmed
  statistics. Refunds have no representation (§4.11).
- **Missing transactions.** Cannot be told apart from frugality. The zero-day confirmation is
  the only positive "I really spent nothing" signal, and it should drive the coverage ratio.
- **Irregular income.** A simple 3-month arithmetic mean of *income* is misleading for
  freelance and e-commerce users. One good month inflates the plan. A floor such as the
  lowest month, or a median, is safer for planning *spending*. A mean of *spending* is less
  dangerous, but still distorted by lumpy categories.
- **Minimum evidence (recommendation).** Show a personalised spending estimate only when there
  is at least one complete month **and** coverage ≥ ~80% of days. Label the estimate
  "provisional" until there are 3 complete months. Show the per-category confidence.
- **Skip / shorten / extend.** Yes to all three. The VS-34 history shows that a forced wait
  makes the app look empty.
- **Useful before 3 months:** logging, envelopes from the user's own estimates, recurring
  bills, planned purchases, entering debts, setting wallet balances, and starting a starter
  buffer. All but the last exist today.

### 1.4 Approaches compared

| | A. Mandatory 3-month observation | B. Immediate planning from estimates | C. Hybrid |
|---|---|---|---|
| Fit with current code | Poor. Re-introduces the gating removed in VS-34 | Good. The planner, envelopes and "use last month" already exist | Best. Reuses the planner and `suggestFromHistory`, and adds a confidence layer |
| UX | 3 months of an app that "doesn't do anything yet". Already shown to fail | Fast, but estimates are usually optimistic | Useful on day 1, and becomes more accurate over time |
| Data quality | Highest, if the user stays | Low at first | Rises over time; visibly labelled |
| Risk | Abandonment | Plans built on wishful numbers, never revisited | More logic to build: completeness, confidence, the "your estimate vs your reality" prompt |

**Recommendation: C (hybrid).** The planner already offers "Use my averages" next to manual
entry, so the product is effectively C without the honesty layer. What is missing is:
(1) a short baseline at onboarding (estimates of fixed bills, income pattern, wallet
balances, existing debts); (2) completeness and coverage tracking; (3) fixing the averaging
bias (§4.3); (4) a monthly "estimate vs actual" review that offers to replace estimates with
observed figures once there is enough evidence. Observation becomes a **quality label on
data**, not a mode that hides features.

---

## 2. Stage-by-stage readiness

### Stage 0 — Understand (reliable baseline)

- **Reusable:** expense/income logging, categories, wallets, transfers, zero-day, reports,
  MoM comparison, imprévus, `suggestFromHistory`.
- **Missing data:** opening balances with a date, fixed obligations, income pattern
  (regular/irregular, pay day), existing debts at start, household or social obligations.
- **Missing rules:** month completeness, logging coverage, unbiased averages, exclusion of
  one-offs.
- **Missing UI:** a baseline step in onboarding (today: 4 text panels), and a "your typical
  month" summary.
- **Backend (eventual):** possibly a dated balance-adjustment entry, and per-expense
  exceptional/essential tags.
- **Blocking defects:** §4.1 (wallets miss recurring and quick-add), §4.3, §4.10.
- **Non-breaking now:** coverage metric and completeness, computed from existing tables;
  correcting the averaging divisor.

### Stage 1 — Take control (allocate, plan, compare)

- **Reusable:** the entire envelope system (planner, Unassigned to zero, rollover, moving
  money between envelopes, pacing, burn-down, MoM). This is the strongest part of the app.
- **Missing data:** expected income; essential vs discretionary classification.
- **Missing rules:** what the month's pot is when income is irregular or late (§4.4); keeping
  fixed costs out of the run-rate projection (§4.7); one shared health definition (§4.6).
- **Missing UI:** no "give every franc a job" step when income arrives (that was the parked
  allocation screen).
- **Risks:** reviving the parked percentage split as it was would reintroduce the month lock,
  the immutable-income rule and the logical-vs-physical fund problem (FINANCIAL_LOGIC §5).
- **Non-breaking now:** the edit and back-dating check fixes (§4.2); the planner label fix;
  unifying health.

### Stage 2 — Stabilise (starter buffer, near-term obligations, expensive debt)

- **Reusable:** recurring expenses (obligations), planned lists with due dates and reminders,
  the debt ledger, wallet purpose `emergency` (label only).
- **Missing data:** buffer target and progress; upcoming obligations with amounts and dates
  over a 30–90-day horizon; debt interest/cost, instalments, partial payments; tontine cycles.
- **Missing rules:** "safe to spend" = cash − reserved obligations − buffer; debt priority;
  the effect of debt on wallets (§4.5).
- **Missing UI:** a buffer goal card; an upcoming-obligations timeline; a debt payment flow.
- **Multiple simultaneous priorities:** **not supported.** There is no goal entity, so a buffer
  and debt repayment cannot run side by side. The parked design ran them in strict sequence
  (emergency → savings → projects), which does not express "build 1 month of buffer *while*
  repaying the 15% loan" either.

### Stage 3 — Protect (full emergency reserve)

- **Reusable:** parked `funds` (target, progress, deposit/withdraw history, redistribution
  when the target is met), wallet purpose labels.
- **Missing:** target expressed as **months of essential expenses**, which needs Stage 0
  averages; a link between the reserve and real wallets; withdrawal → replenish flow;
  insurance or shock planning.
- **Dependency:** a sound essential-spend average (Stage 0) and trustworthy wallet balances
  (§4.1).

### Stage 4 — Build wealth

- **Reusable:** wallets (as cash assets), debts (as liabilities), parked `projects` (target,
  priority, timeline estimate).
- **Missing:** savings rate, net worth snapshots, a non-cash asset model (land, livestock,
  stock, BRVM/BVMAC holdings, business equity), sinking funds.
- **Backend (eventual):** asset and valuation tables; month-end snapshots (history is
  recomputed today, FINANCIAL_LOGIC §4.12).

### Stage 5 — Financial independence

- **Reusable:** nothing directly.
- **Missing:** projected annual spending, investable assets, an assumed return/inflation
  locally relevant to the FCFA zone, an FI number and date.
- **Dependency:** every stage above. This is the most speculative stage. Its assumptions must
  be explicit and user-editable.

---

## 3. Missing capabilities and their dependencies

```
Fix wallet integrity (§4.1, §4.10) ─┬─> Net worth ─> Stage 4/5
                                     ├─> Emergency coverage (months) ─> Stage 3
Unbiased averages + completeness ───┼─> Essential-spend baseline ──┘
                                     └─> Hybrid planning (Stage 0→1)
Expected income / pot rule (§4.4) ──> Allocation on income (Stage 1)
Goal entity (buffer, sinking, debt) ─> Multiple priorities (Stage 2+)
Debt ↔ wallet + partial payments ────> Debt strategy (Stage 2)
Obligations horizon (recurring+planned) ─> Safe-to-spend (Stage 2)
```

---

## 4. Prioritised risks

1. **Wallet balances are wrong for recurring and quick-add users** (§4.1). Any progression
   built on cash figures inherits this.
2. **The averages are biased** (§4.3). A personalised plan built on them would be confidently
   wrong.
3. **The default budget follows income received** (§4.4). Irregular earners get a budget that
   grows with each payment, and salaried users get no guidance before payday.
4. **Debt is not money** (§4.5). Stage 2 cannot be modelled on the current ledger.
5. **Reviving parked code unchanged** reintroduces the logical-vs-physical split and the month
   lock that VS-34 removed on purpose.
6. **Deletes are not synced**, so history-based metrics can shift after a restore.

---

## 5. Open product decisions

1. **Allocation model:** should allocations be *virtual earmarks* over total cash (envelopes
   over a single pool), or *physical* (one wallet per goal, moved with transfers)? Wallet
   purposes suggest physical; the parked funds were virtual with no reconciliation.
2. **Monthly pot for irregular income:** last month's income, a floor or median of recent
   months, an expected figure the user types, or "what's in the wallets now"?
3. **Tontines:** model them as a savings goal with a payout date, as a recurring obligation, or
   as a new entity with a rotation schedule?
4. **Family support / social obligations:** a category, a recurring obligation, or a budget
   line protected from cuts?
5. **Debt scope:** should formal debts (bank, microfinance) with interest live alongside the
   informal people ledger, or separately?
6. **Observation UX:** should the "provisional" label be shown per category or per month, and
   what coverage threshold should apply?
7. **Is the original "gatekeeper" (allocate before spend) still the core promise**, or has the
   daily loop chosen in VS-34 replaced it? Stage 1 depends on the answer.
