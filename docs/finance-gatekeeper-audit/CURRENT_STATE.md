# Finance Gatekeeper — Current State Audit

**Audited:** 2026-10-13, branch `main` at `7713e8c` (clean tree). Read-only audit; no code,
schema or config was changed.

**Evidence labels used throughout**

- **Verified**: I read the code path, and a cited file/line shows it.
- **Inferred**: follows from the verified code, but I did not trace it end to end (for example UI copy or rendering).
- **Recommendation**: my opinion; not a statement about the code.

> **Read this first.** `docs/PRODUCT DOCUMENT.md` and `docs/ARCHITECTURE.md` describe a
> product that **no longer exists on `main`**: Learning/Control modes, income allocation,
> the emergency fund, savings and projects. VS-34 (`docs/KANBAN.md` §VS-34) removed all of
> them from `main` and parked them on `feat/parked-projects-funds-allocation`. The code, not
> those two documents, is the source of truth below.

---

## 1. Architecture

| Area | What exists (verified) |
|---|---|
| Framework | Expo SDK 54, React Native 0.81, React 19.1, Expo Router 6, TypeScript strict (`package.json`) |
| Layering | ExFeAr: `src/app/` routes → `src/features/finance/<slice>/` → shared root folders (`CLAUDE.md`) |
| Slices on `main` | `accounts`, `auth`, `backup`, `budget`, `dashboard`, `dataTransfer`, `debt`, `expenses`, `income`, `onboarding`, `planned`, `reports` |
| Parked (not on `main`) | `funds`, `projects`, the income split and allocation screens: branch `feat/parked-projects-funds-allocation` |
| Navigation | Drawer → bottom tabs **Dashboard · Transactions · Budget · Reports** (`src/app/(drawer)/(tabs)/_layout.tsx`); drawer rows Accounts, Categories, Debts, Planned purchases, Export/Import, Backup (`src/components/AppDrawerContent.tsx:45-55`) |
| State | React hooks per slice (`*.hooks.ts`); no global store. Cross-feature "attention" counts go through `components/AttentionProvider` |
| Local DB | expo-sqlite, 35 migrations in `src/services/migrations/` (001–035); source of truth on-device |
| Cloud | Supabase auth plus a push/pull **backup sync**, last-write-wins, with a single timestamp cursor (`src/services/sync.ts`). RLS: owner-only policy on every table (`supabase/schema.sql:24,280-283`). **Deletions are never synced** (`docs/CLOUD-SYNC.md:138-140`) |
| Snapshots | Daily (7 kept) and safety snapshots (5 kept) of local data (`src/services/snapshots.service.ts`) |
| Root wiring | `src/app/_layout.tsx:74-108`: AuthGate (PIN) → OnboardingGate → AttentionProvider → RecurringAutoLogger → Debt/Planned/Daily reminder schedulers → ZeroDayGate |
| i18n | en/fr catalogues per slice; every UI string goes through `t()` (VS-35) |
| Tests | Jest, with in-memory better-sqlite3 for service tests; 150 test files colocated in `__tests__/` |

### Tables in the schema and whether `main` uses them

| Table | Used by `main`? | Notes |
|---|---|---|
| `expenses` | Yes | `amount INTEGER`, `category_id`, `subcategory_id`, `date`, `is_recurring`, `account_id` (nullable), `is_unplanned` |
| `income` | Yes | `source` restricted to `salary \| freelance \| ecommerce` (CHECK, mig. 004); `allocation_status` is vestigial and always `'allocated'` |
| `categories` | Yes | Two levels (parent/sub); defaults: Food, Transport, Bills, Health, Entertainment, Education, Shopping, Other (`constants/categories.ts`) |
| `accounts` | Yes | `type` (cash/mobile_money/bank/card), `purpose` (spending/saving/emergency/general: **label only**), `opening_balance` (undated) |
| `transfers` | Yes | Insert and read only. There is **no edit or delete function** for transfers |
| `allocations` | Partly | Used only as the holder of `total_budget` (mig. 027). The four `*_pct` columns are filled with 0/0/0/100 and never read (`budget.service.ts:23-29`) |
| `category_budgets` | Yes | Per month and category: `allocated_amount`, `rollover_enabled` |
| `recurring_expenses` | Yes | `monthly \| weekly`; auto-logged when the app opens |
| `quick_add_templates` | Yes | |
| `zero_days` | Yes | |
| `debts` | Yes | Person, amount, direction (lent/owed), due date, pending/settled. No interest, no instalments, no account link |
| `planned_lists`, `planned_items` | Yes | Shopping lists; ticking an item creates an expense |
| `funds`, `fund_transactions`, `projects`, `project_transactions` | **Read only by `accounts.balance`** | No UI on `main`. Legacy rows that carry an account still reduce wallet balances (`accounts.balance.ts:25-28`) |
| `users` | Yes | PIN, reminder, language, `onboarding_complete`. `app_mode` is vestigial and unread |

---

## 2. Actual user journey (verified)

1. **First launch** → PIN setup (AuthGate) → 4-panel **informational** carousel: "Track every
   franc / Budget by category / See where it went / You're all set"
   (`features/finance/onboarding/OnboardingScreen.tsx`, `i18n/locales/en/onboarding.ts`).
   **It collects no data**: no income, no expenses, no goals, no savings, no balances. Skip is
   allowed.
2. **Defaults created silently**: the default categories (mig. 001), three wallets (Cash as
   the default with purpose `spending`, MTN MoMo and Orange Money as `general`, all with a 0
   opening balance; mig. 018), and a 21:00 reminder (mig. 008).
3. **Daily loop**
   - **Log an expense**: amount, category (required), subcategory, note, date, wallet, and an
     "imprévu" flag. Before saving, the app checks the category envelope and the month total
     (`ExpenseEntryPanel.tsx:105-112`). The check warns but never blocks.
   - **Log income**: amount, source (3 fixed values), date, note, wallet. It saves directly;
     there is no allocation step (`income.service.ts:50-77`).
   - **Quick-add** tiles, **recurring** expenses auto-logged on open, **zero-day**
     confirmation, **transfers** between wallets.
   - **Planned purchases**: lists with a due day; ticking an item creates a real expense
     (`planned.purchase.ts`).
4. **Budget tab**: there are no modes or gating. The month's total budget is the explicit
   `total_budget`, or failing that **the month's logged income**. Per-category envelopes,
   optional rollover, pacing, a burn-down and a planner. The planner offers three shortcuts:
   income, last month, and "my averages", which is the per-category mean of the previous three
   months.
5. **Dashboard**: month overview (budget, income vs expenses, imprévus), quick actions, the
   planned-due card, wallets with live balances, today's spending, and a 7-day sparkline.
6. **Reports**: monthly income vs expenses, budget performance, a category donut, imprévus,
   a debt summary, month-over-month comparison and a ">10% increase" suggestion. There is also
   a weekly report.

**What the user is never asked:** expected income, fixed obligations, existing savings,
existing debt, household obligations, goals, or opening wallet balances. Opening balances
are optional, and only on account create or edit.

---

## 3. Feature implementation matrix

| # | Capability | Status | Evidence | Current behavior | Gap | Risk |
|---|---|---|---|---|---|---|
| 1 | Onboarding & financial baseline | **PARTIAL** (intro only) | `onboarding/OnboardingScreen.tsx`; mig. 025 | Four text panels; no data entry | No baseline: income, fixed costs, balances, debts and goals are not captured | Every insight starts from zero; balances wrong unless the user finds the wallet form |
| 2 | Transaction recording & categorisation | **IMPLEMENTED** | `expenses.service.ts:86-115, 714-775`; `ExpenseEntryPanel.tsx` | Create/edit/delete expenses; 2-level categories; required category; quick-add; imprévu flag | No refunds or negative entries; no essential/discretionary tag | Low |
| 3 | Income recording | **IMPLEMENTED** | `income.service.ts:50-129` | Create/edit/delete; 3 fixed sources; optional wallet | Sources fixed to salary/freelance/ecommerce by a DB CHECK; no "expected vs received" | Business, gifts, tontine payouts and debt repayments are mislabelled or omitted |
| 4 | Income allocation | **NOT IMPLEMENTED on `main`** (parked) | `budget.service.ts:5-14`; KANBAN VS-34 | Income is recorded only | No way to give income a job before spending | This is the product's founding idea, and it is currently absent |
| 5 | Available-balance calculation | **PARTIAL** | `accounts.balance.ts:17-33`; `dashboard.service.ts:117-129` | Two separate notions: wallet balances (derived per wallet) and a month "remaining" (budget − spent) | No "safe to spend = cash − upcoming obligations − reserves"; no total cash on hand | The user can read either number as "what I can spend" |
| 6 | Budgeting & spending limits | **IMPLEMENTED** | `budget.plan.ts`, `budget.envelopes.ts`, `budget.progress.ts` | Month total and category envelopes, rollover, moving money between envelopes, pacing, non-blocking warnings | See FINANCIAL_LOGIC §4 for defects | Medium |
| 7 | Monthly spending summaries | **IMPLEMENTED** | `reports.service.ts:216-256` | Totals, categories, MoM comparison, imprévus | Debt summary is not month-specific | Low |
| 8 | Three-month observation period | **NOT IMPLEMENTED** (removed) | KANBAN VS-08, VS-24, VS-34 | A one-month "Learning mode" existed and was deleted in VS-34; `users.app_mode` is unread | No observation state, no completeness tracking | — |
| 9 | Average expense calculation | **PARTIAL** | `budget.plan.ts:153-182` (`suggestFromHistory`) | Per-category mean over the previous 3 months, **dividing by the months that had spend in that category** | No overall monthly average shown; no partial-month handling; inflates one-off categories | Misleading suggestions (FINANCIAL_LOGIC §4.3) |
| 10 | Irregular-income handling | **NOT IMPLEMENTED** | `budget.service.ts:97-110` | Default budget = income logged so far this month | No expected income, no smoothing, no buffer month | Budget is 0 until salary lands, and then grows with every freelance payment |
| 11 | Upcoming & recurring expenses | **PARTIAL** | `expenses.service.ts:519-700`; planned slice | Recurring auto-log (monthly/weekly); planned lists with due dates and reminders | Nothing projects future obligations or reserves money for them; no annual/quarterly frequency | Money committed for rent looks spendable |
| 12 | Sinking funds | **NOT IMPLEMENTED** | — | Envelope rollover is the closest mechanism | No target, no deadline, no monthly set-aside | — |
| 13 | Starter emergency buffer | **NOT IMPLEMENTED** (parked) | parked `funds.service.ts` | Wallet `purpose = 'emergency'` is a label only | — | — |
| 14 | Full emergency fund | **NOT IMPLEMENTED** (parked) | same | — | — | — |
| 15 | Debt tracking & repayment planning | **PARTIAL** (informal ledger) | `debt.service.ts`; mig. 014 | Lent/owed per person, due date, reminders, settle in one step | No interest, instalments, partial repayment, schedule or wallet effect | Settling or lending does not move any money (FINANCIAL_LOGIC §4.5) |
| 16 | Tontines & social obligations | **NOT IMPLEMENTED** | grep: no matches | Could only be logged as an expense or a debt | No domain concept | Contributions get misclassified |
| 17 | Savings goals | **NOT IMPLEMENTED** on `main` (parked) | — | — | — | — |
| 18 | Net worth tracking | **NOT IMPLEMENTED** | — | Wallet balances and debt totals exist separately | Nothing combines them | — |
| 19 | Investment tracking | **NOT IMPLEMENTED** | — | — | — | — |
| 20 | Financial independence planning | **NOT IMPLEMENTED** | — | — | — | — |
| 21 | Financial progress indicators | **PARTIAL** | dashboard, reports | Budget pace, MoM change, imprévus share | No savings rate, months of runway, debt trend or streak | — |
| 22 | Notifications & reminders | **IMPLEMENTED** | `auth/reminder.ts`, `debt.hooks.ts:143`, `planned.reminders.ts` | Daily log reminder (respects the toggle); debt and planned due reminders (**ignore** the toggle, per KANBAN VS-39) | No budget or obligation alerts as notifications | Low |
| 23 | Historical financial snapshots | **UNVERIFIED as financial history**; IMPLEMENTED as data backup | `snapshots.service.ts` | DB copies kept for restore | No month-end figures are frozen (balance, net worth) | History is recomputed live, so it changes when old rows are edited |
| 24 | Validation & reconciliation | **PARTIAL** | Positive-integer checks in every service | Input validation only | No "actual balance is X" adjustment; transfers cannot be corrected | Wallet balances drift with no fix path |
| 25 | Automated tests | **IMPLEMENTED** (broad) | 150 test files | Service tests on in-memory SQLite, plus screen tests | The defects in FINANCIAL_LOGIC §4 have no tests, by construction | — |

---

## 4. Known limitations and uncertainties in this audit

- I did not run the app on a device. UI behaviour is inferred from components, copy and tests.
- I did not audit the Supabase server-side SQL in depth beyond the RLS pattern.
- Parked code was read only as far as `funds.service.ts` signatures, through `git show`.
- I ran the Jest suite read-only (`npx jest`). The result is in the final response, not here.
- Product-intent statements come from `docs/PRODUCT DOCUMENT.md` and `docs/KANBAN.md`. Where
  they disagree with the code, the code wins.
