# 01 — Product understanding, current state, inventory, user questions

Report sections 2, 3 and 6. Evidence labels are defined in the [README](README.md#evidence-labels).

---

## 2. Product understanding and current-state assessment

### 2.1 The problem the product solves

From `docs/PRODUCT DOCUMENT.md` §1 and the code on this branch:

> When income arrives, nothing stands between the money and impulse spending.

The original answer was **allocate before you spend**: income split by percentages into an
emergency fund, savings, projects and a spending pot. That model was **removed in VS-34** and
parked on `feat/parked-projects-funds-allocation` (Verified: `docs/finance-gatekeeper-audit/CURRENT_STATE.md`
"Read this first"). The "every franc has a job" idea survives in a different form (Verified, glossary):

| Original idea | How it exists today |
|---|---|
| Allocate income first | Budget planner: share the month's budget across envelopes until *Unassigned* is 0 |
| Emergency fund, savings | **Goals** in real wallets (starter buffer, sinking funds, emergency reserve sized in months of essentials) |
| Savings priority | **Pay yourself first**: goal amounts are set aside before the envelopes share the rest |
| Extra income | "Give it a job" surplus card — never raises the budget by itself |
| Learning mode (month 1) | **My path** (VS-63): Observe → See → Plan → Optimize → Grow, derived from data, never a mode |

**Interpretation.** The product today is a *daily-logging and envelope-budgeting* app with an
honesty layer (observed vs estimated, provisional figures) and a guided path from observation
to control. The gatekeeper philosophy now lives mainly in the Budget tab and goals.

### 2.2 The primary user

- **Verified (docs):** a salaried professional in Central/West Africa with irregular freelance and
  e-commerce income; money moves through cash and mobile money; informal lending and tontines
  are common; emergencies are unpredictable; FCFA only. Today the only user is the builder.
- **Context (research, [03](03-research.md#r12)):** in Sub-Saharan Africa mobile money accounts (≈40% of
  adults in 2024) now exceed bank accounts — wallets, not bank statements, are the money reality.
  No automatic import exists (manual logging is the whole data source).
- **Financial literacy (Hypothesis).** The builder is financially literate — they designed the
  rules. But the product document lists "public release with onboarding" as a future step, and
  the app is bilingual. I recommend designing copy for a *non-expert in a hurry at 21:00*, the
  moment the daily reminder fires. Anything the builder needs explained in a glossary, a new
  user will not infer from a label. (Decision D10.)

### 2.3 What the user needs to understand about their money (by importance)

| Level | What | Where it is computed (Verified) |
|---|---|---|
| **Essential** (every day) | What I spent today / this month; what my plan still allows; whether I am on pace | `dashboard.service`, `budget.plan.getBudgetOverview`, `budget.progress.budgetHealth` |
| **Essential** (weekly) | Which categories are running hot; what is due soon (bills, planned purchases, debts, tontines) | envelopes, `budget.committed.getCommitted`, AttentionProvider |
| **Contextual** | Wallet balances; cash not already promised; expected vs received income; why money went (routine / events / unexpected / everyday) | `accounts.balance`, `budget.cashflow`, `expenses.reason` |
| **Advanced** (monthly or later) | Typical month vs starting point; estimate vs actual; savings rate; net worth and its history; goal progress | `reports.profile`, `reports.startingPoint`, `networth.*`, `goals.*` |

### 2.4 Decisions each screen should enable

| Screen | Decision after reading it |
|---|---|
| Home | "Am I OK today? Log what I just spent." |
| Transactions | "Is everything logged and right? Fix this entry." |
| Budget | "Can I afford this purchase? Move money between categories? Plan next month?" |
| Category detail | "Is this category a habit to change or a one-off? What should next month's figure be?" |
| Reports | "How did the month go, and what does a month really cost me?" |
| My path | "What should I focus on now, and what comes next?" |

### 2.5 How the app supports observation → control → optimisation today

**Verified:** `journey.service.getJourney` derives the step from data; `JourneyCard` on the
Dashboard and the `My path` tab show it; VS-64 (locked previews) and VS-65 (variable-cut
suggestions) are in the KANBAN backlog. **Interpretation:** the *journey exists as a model*,
but the rest of the interface does not yet listen to it — every screen shows every stage's
content at once (finding F-02).

### 2.6 Architectural constraints that shape any redesign

- ExFeAr layering; `app/` routes are thin; cross-feature imports only along the approved list
  in `CLAUDE.md`. A redesign that, say, puts goal progress on Home needs either a new approved
  edge or navigation by path (the established workaround).
- Every string in `src/i18n/locales/{en,fr}`; French is type-checked against English. **Every
  copy change is two changes** and must be reviewed in French, where some collisions are worse
  (F-01).
- 300-line file limit; 232 test files, 96 of them screen tests asserting `testID`s and English
  copy — copy changes will break tests by design (file 06 §11).
- Shared infra (`components/`) can never import features: stage-aware components need the
  journey step published through a shared provider (the VS-64 plan already says this).

---

## 3. Inventory of screens and important journeys

### 3.1 Navigation shell (Verified)

- **Bottom tabs (5):** Dashboard · Transactions · Budget · Reports · My path
  (`src/app/(drawer)/(tabs)/_layout.tsx`).
- **Drawer (`src/components/AppDrawerContent.tsx:45-71`):** Preferences · *Management*: Accounts,
  Categories, Debts, Planned purchases (dot), Goals, Tontines (dot), Events, Export & Import,
  Backup & Restore, Delete & Reset (**"Soon", disabled**) · *Application*: Help (**"Soon",
  disabled**), Feedback.
- **Root gates (`src/app/_layout.tsx`):** PIN (AuthGate) → OnboardingGate → providers →
  recurring auto-logger and reminder schedulers → ZeroDayGate (a no-spend prompt on open after
  the reminder time).

### 3.2 Screen inventory

| Area | Routes | Main feature component | Size (lines) |
|---|---|---|---|
| Dashboard | `(tabs)/dashboard` | `dashboard/DashboardScreen` + `MonthOverviewCard`, `QuickActionBar`, `JourneyCard`, `PlannedDueCard`, `WalletsCard`, `TodaySpendingCard` | 201 + 286 + … |
| Transactions | `(tabs)/transactions`, `expenses/log`, `expenses/[id]`, `income/log`, `income/[id]`, `expenses/quick-add`, `expenses/recurring`, `expenses/categories` | `TransactionsScreen`, `TransactionList`, `AddTransactionSheet`, `ExpenseEntryPanel` | 79, 259, 150, 260 |
| Budget | `(tabs)/budget`, `budget/plan`, `budget/category/[id]`, `budget/estimates` | `BudgetOverview`, `BudgetHeroCard`, `MoneyViewCard`, `SurplusCard`, `CategoryEnvelopeRow`, `BudgetInsights`, `BudgetPlannerScreen`, `CategoryDetailScreen` | 255, 195, 101, 47, 183, 180, 286, 207 |
| Reports | `(tabs)/reports`, `reports/weekly`, `reports/net-worth` | `MonthlyReport` + `NetWorthCard`, `TypicalMonthCard`, `EstimateVsActualCard`, `UnplannedCard`, `WhyBreakdown`, donut, `MonthComparison` | 246 + … |
| My path | `(tabs)/path` | `JourneyScreen`, `JourneyStepDetail`, `BaselineCard` | 138, 110 |
| Money objects (drawer) | `accounts/*`, `transfers/*`, `debt/*`, `goals/*`, `tontines/*`, `planned/*`, `events/*` | one list + detail + form per slice | — |
| App | `settings`, `profile`, `profile/change-pin`, `backup`, `data-transfer` | `SettingsScreen`, `ProfileScreen`, `BackupScreen`, `DataTransferScreen` | — |

About 45 route files in total.

### 3.3 Important user journeys

| # | Journey | Current path (Verified unless marked) | Notes |
|---|---|---|---|
| J1 | First launch | PIN setup → 4-panel carousel ("Track every franc / Budget by category / See where it went / You're all set") → Dashboard | Collects no data. Baseline checklist is on the My path tab only (moved there in VS-63) |
| J2 | Log an expense (daily core) | Dashboard *Expense* tile or Transactions FAB → sheet: amount → category picker (category, then subcategory or "Use …") → *Unexpected* toggle, *Event*, *Description*, date, wallet → Save → possible over-budget modal → toast | ≈5 taps plus typing for the minimal case (Inferred) |
| J3 | Confirm a no-spend day | Dashboard button "I spent nothing today", or ZeroDayGate prompt on open after the reminder time | **Today only** (F-03) |
| J4 | "Can I afford this?" | Budget tab → hero *Left to spend* → (scroll) *Your money now* → *Safe to spend* | Six candidate figures (F-01) |
| J5 | Plan a month | Budget tab empty state or *Edit plan* → planner (budget source, *Copy last month* / *Use my averages*, per-category amounts, *+ rest*) → Save | Strong flow; label issues only |
| J6 | Understand a category | Envelope row → category detail: envelope + vs usual → Where it went → Why → Next month → Transactions | Already question-led (strength) |
| J7 | Monthly review | Reports: Net worth → Typical month → Estimate vs actual → month stepper → in/out → performance → unexpected → why → categories → debt → comparison → weekly link | Scope confusion (F-06) |
| J8 | Follow the path | Dashboard Journey card or My path tab → current step detail → action (Open Reports / Plan next month / Open goals) | Observe gives little short-term feedback (F-03) |
| J9 | Record money owed / tontine / goal saving | Drawer → slice list → form; saving to a goal is a transfer into its wallet | Drawer mixes money objects with admin (F-12) |

---

## 6. User questions and needs by screen

Written in the GOV.UK need format ("I need… so that…", [03 R3](03-research.md#r3)). **All are
hypotheses** derived from the product intent and the code, not from research with users.

| Screen | Question that brought the user here | The one thing to understand | Supporting context | Belongs elsewhere | Action that should follow | Risks of confusion / anxiety today |
|---|---|---|---|---|---|---|
| **Home** | "I need to know if today is OK and log what I spent, so that nothing slips." | Where this month stands against the plan — or, while observing, what has been spent and logged | Days left; today's spend; what needs me (bills/planned/tontine due) | Wallet-by-wallet detail, net cashflow, the 7-day sparkline (Transactions/Reports) | Log an expense; mark a no-spend day | "Left to spend" read as cash (F-01); stage mismatch (F-02) |
| **Transactions** | "I need to check and correct what I logged, so that my numbers are true." | The list is complete and correct for this month | Day totals; filters | Analytics | Edit/delete; add missing entry | No search (F-17); day net mixes income and spending |
| **Budget** | "I need to know whether I can afford something and where I am overspending, so that I can adjust before the month ends." | What the plan still allows, and whether I am on pace | Per-category envelopes; what is still unassigned; projection | Multi-month analytics (Reports); wallet balances (Accounts) | Move money between categories; edit plan | Duplicate and look-alike figures (F-01, F-04) |
| **Category detail** | "I need to know why this category is high, so that I can decide whether to change a habit." | This month vs a usual month | Where it went, why, repeats | — | Set next month's figure | Part chips compare a projection without saying so (F-15) |
| **Reports** | "I need to see how the month went and what a month really costs me, so that I can plan the next one." | This month's result: spent vs income vs plan, and why | Category breakdown; change vs last month | Net worth (Grow stage) | Open a category; plan next month | Top cards ignore the month stepper (F-06); 10 sections (F-05) |
| **My path** | "I need to know what to focus on now, so that I make progress without being overwhelmed." | The current step, how far along it is, and the next action | What the next step unlocks | Full baseline checklist could live in onboarding | Do the step's action | "0 of 3 months" for weeks (F-03) |
| **Wallets / Accounts** | "I need my wallet balances to match reality, so that I can trust the app." | Each wallet's balance and when it was last confirmed | Unlinked expenses | — | Confirm a balance | No total; no "last checked" on the Dashboard card (F-11) |
| **Goals / Debts / Tontines** | "I need to see what I owe, am owed and am saving for, so that I meet obligations." | What is due next and progress to target | History | — | Pay / save / record repayment | Reachable only through the drawer (F-12) |
