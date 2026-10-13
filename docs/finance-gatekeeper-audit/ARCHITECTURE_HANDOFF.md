# Finance Gatekeeper — Architecture Handoff

Self-contained context for an architect planning the financial-progression work. It is based
on a read-only audit of `main` @ `7713e8c` (2026-10-13). Details and evidence are in the
sibling files: `CURRENT_STATE.md`, `FINANCIAL_LOGIC.md` and `PROGRESSION_GAP_ANALYSIS.md`.

## 1. Product in one paragraph

A single-user, offline-first personal finance app for Central/West Africa, in FCFA only. The
founding idea was "every franc gets a job before it is spent", followed by a period of
observation and then a plan. **Today's `main` is a daily-loop app instead**: log
transactions, budget by category envelopes, read reports. Allocation, funds, projects and the
Learning/Control modes were built, then parked in VS-34 on
`feat/parked-projects-funds-allocation`, because they gated or complicated the daily loop.
`docs/PRODUCT DOCUMENT.md` and `docs/ARCHITECTURE.md` still describe the parked design. Do not
treat them as current.

## 2. Stack and hard constraints

- Expo 54 / RN 0.81 / React 19 / Expo Router 6 / TypeScript strict / expo-sqlite / Supabase
  (auth + backup sync) / i18next (en + fr) / Jest with in-memory SQLite.
- **ExFeAr layering:** `src/app` holds thin routes. `src/features/finance/<slice>` holds the
  logic. Root folders (`components`, `services`, `utils`, `constants`, `i18n`, …) are shared
  and **never import features**.
- **Cross-feature imports are restricted to an approved list** in `CLAUDE.md` (e.g.
  `budget → expenses`, `reports → expenses/income/budget/debt`). A new progression slice needs
  its edges approved there. Features publish "needs attention" counts to the shared
  `AttentionProvider` rather than being imported.
- **Migrations:** numbered files in `src/services/migrations/` (next is **036**). Each synced
  table needs sync metadata and an update trigger (`017_add_sync_metadata.ts`). Each also needs
  a matching **Supabase patch** that the user runs by hand before the build syncs. Schema
  changes also affect export files (`dataTransfer.service.ts`). VS-34 explicitly avoided
  dropping columns for that reason.
- **Sync:** last-write-wins, single cursor, **no tombstones**, so deletes do not propagate.
  Prefer soft-delete or append-only designs for new financial history.
- **Code rules:** TDD, JSDoc on every export, no `any`, files ≤ 300 lines, every string in
  `i18n/locales/{en,fr}`.
- **Money:** integer FCFA everywhere; amounts > 0 (no negative or refund rows).

## 3. Verified implementation status (short form)

| Solid, reuse as-is | Exists but flawed | Absent on `main` |
|---|---|---|
| Expense/income CRUD, categories, quick-add, zero-day | Wallet balances (recurring/quick-add rows have no wallet) | Income allocation |
| Category envelopes, planner, rollover, `moveBudget`, pacing, burn-down | 3-month averages (wrong divisor, partial months) | Observation period / completeness |
| Transfers excluded from income/spend | Default budget = income received so far | Savings goals, emergency fund, sinking funds |
| Planned purchases → expense, due-date reminders | Over-budget check on edit and for back-dated expenses | Net worth, investments, FI |
| Recurring auto-log (monthly/weekly) | Debt ledger: no interest, partials or wallet effect | Tontines, social obligations |
| Reports: MoM, imprévus, suggestions | Two different health verdicts (dashboard vs budget) | Expected income, irregular-income rules |
| Backup sync, snapshots, export/import | Undated opening balance; transfers cannot be edited | Balance reconciliation |

Test suite: **150 suites, 1,364 tests, all passing** (`npx jest`, 2026-10-13).

## 4. Entry points

| Concern | Files |
|---|---|
| Month budget, pot rule | `src/features/finance/budget/budget.service.ts`, `budget.plan.ts` |
| Envelopes, carry | `budget/budget.envelopes.ts`, `budget/budget.progress.ts` |
| Averages | `budget/budget.plan.ts` → `suggestFromHistory` |
| Planner UI | `budget/BudgetPlannerScreen.tsx`, `budget/budget.planner.hooks.ts` |
| Over-budget guards | `budget/budget.plan.ts` (`checkOverBudget`, `checkCategoryBudget`); callers `expenses/ExpenseEntryPanel.tsx`, `expenses/ExpenseDetailScreen.tsx` |
| Wallet balance | `accounts/accounts.balance.ts` |
| Recurring | `expenses/expenses.service.ts` → `runRecurringAutoLog`; root `RecurringAutoLogger` |
| Debt | `debt/debt.service.ts`, `debt/DebtReminderScheduler.tsx` |
| Dashboard | `dashboard/dashboard.service.ts`, `dashboard/DashboardScreen.tsx` |
| Reports | `reports/reports.service.ts` |
| Onboarding | `onboarding/OnboardingScreen.tsx`, `OnboardingGate.tsx`, `app/_layout.tsx` |
| Feed | `src/services/transactions.ts` |
| Sync | `src/services/sync.ts`, `sync.mapping.ts`, `migrations/017_add_sync_metadata.ts`, `supabase/schema.sql` |
| Parked funds/projects | `git show feat/parked-projects-funds-allocation:src/features/finance/funds/funds.service.ts` (etc.) |

## 5. Questions to resolve before designing

1. Is "allocate before you spend" still the core promise, or an optional layer on top of the
   daily loop? VS-34 chose the loop.
2. Earmarks: are they **virtual** (labels over pooled cash) or **physical** (one wallet per
   goal, moved by transfers)? This decides whether goal progress is derived from wallets or
   stored.
3. What is the monthly pot for irregular earners: expected income, a floor/median of recent
   months, or current cash?
4. Which baseline facts may onboarding ask for, and how many screens will the user tolerate?
5. What modelling is wanted for tontines, family support and formal vs informal debt?
6. Is a non-cash asset model (land, stock, business) in scope before FI planning?
7. Is a month-end snapshot table acceptable, given the export and sync costs?

## 6. Candidate incremental phases (no schema prescribed)

Each phase ships on its own and leaves the daily loop intact.

0. **Integrity fixes, no new concepts.** Give recurring and quick-add expenses a wallet. Fix
   the edit and back-dated over-budget checks. Unify dashboard and budget health. Correct the
   averaging divisor and exclude partial months. Rename the stale "income split" copy.
   Consider transfer edit/delete and a balance-adjustment entry.
1. **Baseline and observation as data quality.** Add optional onboarding baseline questions
   (fixed bills, pay pattern, wallet balances, debts). Compute logging coverage and month
   completeness from existing tables. Label suggestions "provisional / reliable". Add a
   monthly estimate-vs-actual review.
2. **Obligations horizon and safe-to-spend.** Project recurring and planned items forward.
   Show cash minus upcoming commitments. Decide the irregular-income pot rule.
3. **Goals as one entity.** Starter buffer, sinking funds and emergency reserve, sized in
   months of essential spend. Several active at once. Settle the virtual-vs-physical question
   first. Reuse parked `funds` ideas, not its NULL-wallet deposits.
4. **Debt that moves money.** Partial payments, optional interest and schedule, wallet
   effect. Tontine modelling, as decided in §5.
5. **Net worth and savings rate**, then assets and FI projections.

Phase 0 is low-risk, has no product decisions open, and protects every later phase.
