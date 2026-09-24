# ISSUE-032 — VS-34: Refocus on the Daily Loop (Park Projects, Funds & the Income Split)

## Problem Statement

The app was built for a user who might one day fund projects, run an emergency
fund, and split every paycheck four ways. The user it actually has does two
things every day: **logs transactions** and **reads reports** to understand where
the money went. Everything else is scaffolding around a life that isn't being
lived yet.

Concretely, the speculative features are not merely unused — they are in the way:

- **The income split taxes every income log.** `IncomeLogScreen` navigates to
  `/income/allocate` on save, where a four-bucket percentage breakdown must be
  confirmed before the entry settles. A two-field action became a two-screen flow.
- **Category budgeting — the one budget feature the user wants — is hidden.**
  VS-33 shipped envelopes, pacing, rollover, and per-category over-budget guards,
  but `(tabs)/_layout.tsx:58` renders the Budget tab only when
  `appMode === 'control'`, and `008_create_users_table.ts:19` defaults every
  install to `'learning'`. The feature has been invisible since it landed.
- **Funds and Projects have no front door.** Neither appears in the drawer.
  Funds is reachable only through allocation flows; Projects holds a permanent
  fifth tab slot for a feature that isn't used.
- **Dashboard and Reports spend space on both**, pushing the spending data that
  is read daily further down each screen.

This slice parks the speculative surface on a branch and makes the daily loop —
log, budget by category, read reports — the whole app.

## Product Decisions (confirmed)

1. **Level B extraction, not a full unwind.** Routes, screens, shared-read
   sections, and the two slice folders leave `main`. **Migrations, DB tables, and
   `sync.mapping.ts` stay exactly as they are.** `allocations.projects_pct` and
   friends keep sitting in the schema unread. An unused column costs nothing; a
   schema migration invalidates every existing export file and is the one part of
   this change that cannot be walked back.
2. **Preserve by branch, before deleting.** `feat/parked-projects-funds-allocation`
   is cut from `main` at its current head as the first act of this slice, so the
   parked code is recoverable by merge rather than by archaeology.
3. **Park together:** Projects, Funds, and the income split (allocation screen,
   settings, month lock, held-income pool, emergency redistribution).
   **Keep:** Debt — the user tracks money lent and borrowed.
4. **The Budget tab is ungated.** Category envelopes become the default
   experience for every install. `appMode` survives as a column and a setting;
   only its gates are removed (see Open Questions).

## The consequence that isn't obvious

**Parking the split pulls the floor out from under the budget total.**

`budget.service.ts:269` derives the month's budget as `income × expenses_pct`,
and `budget.plan.ts:44` resolves `explicit ?? derivedTotal`. With no split,
`expenses_pct` means nothing and a NULL `total_budget` has no fallback.

**Resolution: `NULL` comes to mean "the month's total income."** An explicit
`allocations.total_budget` still wins. This preserves VS-33's hybrid design and
its tests wholesale, keeps historical months rendering something sensible, and
needs **no migration** — only `getMonthlyBudget` changes shape.

The rejected alternative — make the total mandatory — forces a setup step before
the Budget tab shows anything at all, which is precisely the friction this slice
exists to remove.

## The trap: allocated income is uneditable

`income.service.ts:120` and `:143` refuse to change the amount or date of an
allocated income, and refuse to delete one. Those guards exist because allocation
moved real money into funds and projects; editing the source would desync the
deposits.

So "mark all new income `allocated`" — the obvious way to stop rows sitting
pending forever — would make **every income entry permanently uneditable**. The
guards must be **removed**, not satisfied. With no allocation, no downstream
deposit exists to desync.

Historical rows already marked `allocated` did move money once. Their
`fund_transactions` and `project_transactions` rows stay frozen in the database,
read by nobody. Editing an old income will not reconcile them — and no longer
needs to, because nothing displays them.

## What needs no changes at all

**Account balances.** `accounts.balance.ts:18-33` subtracts fund deposits and
manual project contributions by querying `fund_transactions` and
`project_transactions` as **raw tables**, not through either slice. Level B keeps
the tables, so every historical wallet balance stays correct with both features
gone from the UI. No compensating logic, no reconciliation pass.

## Information Architecture (after)

```
Tabs
├── Dashboard    — today's spending, trend, cashflow, budget pace
│                  (FundStatusCard and TopProjectCard removed)
├── Transactions — the daily loop: log expense / log income
├── Budget       — always visible; envelopes, pacing, insights
│                  (income-split card removed)
└── Reports      — weekly + monthly; category breakdown, debt
                   (fundProgress and projectProgress sections removed)

Drawer — Preferences · Accounts · Categories · Export & Import
Routes kept:    /expenses/* · /income/log · /income/[id] · /budget/plan
                /accounts/* · /debt/* · /reports/weekly · /transfers/log
Routes removed: /projects/* · /funds/* · /income/allocate
                /budget/settings · /budget/unallocated
```

## Step-by-Step Plan

### Phase 0 — Preservation
1. `git branch feat/parked-projects-funds-allocation main` and push it. **Nothing
   below starts until this branch exists on the remote.**
2. Cut the working branch `feat/vs-34-refocus-daily-loop`.

### Phase 1 — Income logs straight through
3. `IncomeLogScreen.tsx:28` — replace the `/income/allocate` push with a return to
   Transactions. Same for the sheet path in `IncomeEntryPanel.tsx`.
4. `IncomeDetailScreen.tsx` — delete the "Allocate now" CTA (`:150`), the
   `allocated-lock` block (`:106`), and the `/income/allocate` push (`:78`).
5. `income.service.ts` — default `allocationStatus` to `'allocated'` on insert
   (`:60`); **delete the edit guard (`:118-124`) and the delete guard (`:141-145`)**;
   delete `getPendingIncome` (`:74-78`) and `markAllocated` (`:86-88`).
6. `income.hooks.ts:129` — drop `isAllocated` and its consumers.
7. Keep the `allocation_status` column and its mapping: the sync schema stays
   untouched, and a stranded `'pending'` row is now inert rather than stuck.

### Phase 2 — Rebase the budget total on income
8. `budget.service.ts` — `getMonthlyBudget` returns the month's income total as
   the derived figure; drop `calculateBreakdown`, `lockAllocation`,
   `hasConfirmedAnyAllocation`, `updateAllocation`, and the
   `redistributeEmergencyPct` re-export. Keep `getOrCreateCurrentAllocation` —
   it is the row that carries `total_budget`.
9. `budget.plan.ts:44` — `explicit ?? derivedTotal` is unchanged in shape; only
   its input moved. `checkOverBudget` (`:198`) loses its is-locked gate, since
   nothing locks a month any more.
10. Delete `budget.redistribution.ts` and its test.

### Phase 3 — Strip the split from the budget slice
11. Delete `AllocationScreen.tsx`, `AllocationFromIncomeRoute.tsx`,
    `AllocationSettings.tsx`, `AllocationSettingsRoute.tsx`,
    `UnallocatedPoolScreen.tsx`, `UnallocatedPoolRoute.tsx`,
    `IncomeSplitCard.tsx` — and all seven test files.
12. `budget.hooks.ts` — delete `useAllocation`, `useIsFirstEverAllocation`,
    `useUnallocatedPool`. Keep `useBudgetStatus` and `useOverBudgetCheck`.
13. `BudgetOverview.tsx` — remove the demoted income-split card and its section.
14. `budget.types.ts` — drop `Bucket`, `AllocationDraft`, breakdown types.
15. `constants/allocation.ts` — delete; fold any surviving constant into
    `constants/budget.ts`.

### Phase 4 — Ungate the Budget tab
16. `(tabs)/_layout.tsx` — delete `showBudget` and the `href` gate (`:57-58`),
    and the `DeletedProjectsLink` header component (`:40-54`).
17. `(tabs)/dashboard.tsx` — `includeBudgetData` becomes unconditionally true;
    keep `showControlNudge` only if the mode survives Phase 8's decision.
18. Check `reports` for the VS-27 mode gate and remove it for consistency.

### Phase 5 — Routes and tabs
19. Delete `(tabs)/projects.tsx`, `app/projects/`, `app/funds/`,
    `app/income/allocate.tsx`, `app/budget/settings.tsx`,
    `app/budget/unallocated.tsx`.

### Phase 6 — Shared reads
20. `dashboard.service.ts` — remove both slice imports (`:3-4`), the
    `getOrCreateFunds`/`getProjects` fetches (`:122-125`), and the
    `fundProgressList` / `activeProject` blocks (`:150-166`).
21. `dashboard.types.ts` — drop `FundsSummary` and `topProject`.
    Delete `FundStatusCard.tsx`, `TopProjectCard.tsx`, and their tests; trim
    `DashboardScreen.tsx`.
22. `reports.service.ts` — remove the slice imports (`:7-8`), the fetches
    (`:188`), and `fundProgress` / `projectProgress` (`:218-231`).
    `reports.types.ts` and `MonthlyReport.tsx` follow.
23. `notifications/` — delete `triggers/projectTimeline.ts` and its test; remove
    the `projectTimeline` entry from `notifications.config.ts:36` and the union
    member in `notifications.types.ts:6`.
24. `onboarding/OnboardingScreen.tsx` — rewrite the carousel copy that promises
    projects and allocation.

### Phase 7 — Delete the slices
25. `rm -rf src/features/finance/projects src/features/finance/funds`
    (20 source files, 11 test files).
26. `constants/funds.ts`, `constants/projects.ts` — delete. `constants/debt.ts`
    and `constants/icons.ts` reference project strings; trim rather than delete.

### Phase 8 — Docs & verification
27. Root `CLAUDE.md` — rewrite the approved cross-feature dependency list:
    ```
    dashboard → expenses, budget, debt, accounts
    budget    → expenses, income (month income total for the derived budget)
    reports   → expenses, income, budget, debt
    income    → accounts
    expenses  → budget, income, accounts
    ```
28. `budget/CLAUDE.md` — delete the income-split half of "Domain
    Responsibility", the redistribution section, and the split screens from the
    module map. Rewrite the hybrid-total rule with its new NULL meaning.
29. `docs/KANBAN.md` — mark VS-06, VS-09, VS-10, VS-19, VS-25 as **Parked**
    with a pointer to the preservation branch; add this slice as VS-34.
30. `docs/ARCHITECTURE.md` and `README.md` — prune the parked features.
31. Run `npx tsc --noEmit`, the full Jest suite, and `/check-arch`.

## Cross-Feature Edges

This slice **removes** edges; it adds none. After it lands, `budget → funds`,
`budget → projects`, `income → budget`, `dashboard → funds`, `dashboard →
projects`, `reports → funds`, and `reports → projects` are all gone. The
surviving graph is listed in step 27.

## TDD Anchors

This is a subtraction, so the discipline inverts: **most tests are deleted, and
the ones that remain must be proven to still pass unchanged.** New tests are
written only where behaviour genuinely changes.

- Test: `income.service` — an income's amount and date **can** be edited after
  logging, and it can be deleted; both are regressions the old guards would have
  thrown on. New income defaults to `'allocated'`.
- Test: `budget.service` — `getMonthlyBudget` derives the total from the month's
  income when `total_budget` is NULL; an explicit total still wins.
- Test: `budget.plan` — every VS-33 envelope, carry-chain, pacing, and
  `checkCategoryBudget` test passes **unmodified**. `checkOverBudget` now fires
  without a locked allocation.
- Test: `accounts.balance` — a wallet's balance is unchanged by this slice for a
  fixture containing historical fund deposits and manual project contributions.
  This is the regression that proves Level B was safe.
- Test: screens — the Budget tab renders for a `learning`-mode user; Dashboard
  and Monthly Report render with no fund or project sections.

## Open Questions

- **Does `appMode` survive?** Once budgeting is the default and the split is
  gone, `learning`/`control` gates nothing but Reports. The recommendation is to
  keep the column and the Settings toggle for now and remove only the gates —
  widening this slice into an auth cleanup risks it. Revisit once the daily loop
  has been lived in for a month.

## Done When

The user opens the app, logs an expense in two taps and an income in two taps
with no allocation screen in between, opens Budget without touching a setting and
sees this month's category envelopes paced against today, and opens Reports to a
category breakdown uninterrupted by funds or projects.
`git log feat/parked-projects-funds-allocation` shows every parked line intact,
and every wallet balance matches what it showed before the slice.
