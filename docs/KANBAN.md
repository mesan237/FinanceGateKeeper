# Finance Gatekeeper — Kanban Board (Vertical Slices)

## How to Read This Board

Each task is a **vertical slice** that cuts through every layer: database → service → hooks → UI → route. When a task is done, something works end to end.

Every task follows TDD:

1. **Red:** Write failing tests first (Jest for logic, RNTL for screens).
2. **Green:** Implement until tests pass.
3. **Refactor:** Clean up without breaking tests.

Dependencies are explicit. A task cannot start until its blockers are complete. Tasks with no blockers can run in parallel.

---

## BACKLOG

---

### VS-01: Project Scaffold & Core Infrastructure

**Priority:** Critical — everything depends on this
**Blocked by:** Nothing

**Scope:**

- Initialize Expo project with TypeScript and Expo Router
- Configure `@/` path alias in `tsconfig.json`
- Set up Jest + React Native Testing Library
- Create SQLite database connection in `services/database.ts` with migration runner
- Create folder structure matching ExFeAr architecture (empty feature folders, shared infra folders)
- Set up `constants/colors.ts`, `constants/config.ts`
- Create shared UI primitives: `Button.tsx`, `Typography.tsx`, `TextInput.tsx`, `Card.tsx`, `Modal.tsx`, `ProgressBar.tsx`
- Set up root `app/_layout.tsx` with basic navigation shell
- Set up `app/(tabs)/_layout.tsx` with bottom tab bar (Dashboard, Transactions, Budget, Projects, Reports)

**TDD Anchor:**

- Test: migration runner executes migrations in order and tracks which have run
- Test: SQLite connection opens and closes cleanly
- Test: shared components render without crashing

**Done when:** App launches, tab bar is visible, database is initialized, tests pass.

---

### VS-02: PIN Authentication Gate

**Priority:** High
**Blocked by:** VS-01

**Scope:**

- SQLite migration: `users` table (pin_hash, created_at, app_mode)
- `auth.service.ts`: hash PIN, store PIN, verify PIN
- `auth.hooks.ts`: `useAuth` (check if PIN exists, validate entry, lock/unlock state)
- `AuthScreen.tsx`: PIN entry UI with numeric keypad, first-time setup flow (enter + confirm)
- `app/_layout.tsx`: gate all routes behind PIN verification (redirect to auth if locked)
- `app/(auth)/pin.tsx`: thin route rendering `AuthScreen`

**TDD Anchor:**

- Test: `auth.service.ts` — hashing produces consistent output, verification succeeds with correct PIN, fails with wrong PIN
- Test: `useAuth` — returns locked state when no PIN set, unlocked after correct entry
- Test: `AuthScreen` — renders keypad, shows error on wrong PIN, navigates on success

**Done when:** App launches to PIN screen. First launch asks to create PIN. Subsequent launches require PIN to access tabs.

---

### VS-03: Log Expense with Category & View Transactions

**Priority:** Critical — tracer bullet
**Blocked by:** VS-01

**Scope:**

- SQLite migrations: `categories` table (id, name, parent_id, is_default), `expenses` table (id, amount, category_id, subcategory_id, note, date, is_recurring, created_at)
- Seed default categories and subcategories from `constants/categories.ts`
- `expenses.service.ts`: create expense, get all expenses, get expenses by date range, get expenses by category
- `expenses.hooks.ts`: `useExpenseLog` (form state, validation, submit), `useTransactions` (fetch, filter)
- `expenses.types.ts`: Expense, Category, Subcategory types
- `CategoryPicker.tsx`: dropdown/modal showing categories → subcategories
- `ExpenseLogScreen.tsx`: form with amount input, category picker, optional note, date (defaults to today), save button
- `TransactionList.tsx`: chronological list with category labels, amounts, dates, filterable by category and date range
- `app/expenses/log.tsx` and `app/(tabs)/transactions.tsx`: thin routes
- `utils/formatCurrency.ts`: format number to "XXX FCFA" display
- `utils/formatDate.ts`: date formatting helpers

**TDD Anchor:**

- Test: `expenses.service.ts` — creates expense, retrieves by date, retrieves by category, returns empty for no-match filters
- Test: `formatCurrency` — handles zero, large numbers, negative numbers
- Test: `ExpenseLogScreen` — renders form, validates amount > 0, calls service on submit
- Test: `TransactionList` — renders expenses, filters by category, shows empty state when none

**Done when:** You can log an expense, pick a category, and see it in the transactions tab with proper FCFA formatting.

---

### VS-04: Category & Subcategory Management

**Priority:** High
**Blocked by:** VS-03

**Scope:**

- `expenses.service.ts`: add category, add subcategory, rename category, delete category (with reassignment prompt), reorder categories
- `expenses.hooks.ts`: `useCategories` (CRUD operations, optimistic updates)
- `CategoryManager.tsx`: list of categories with nested subcategories, add/edit/delete actions, swipe-to-delete or long-press menu
- `app/expenses/categories.tsx`: thin route
- Update `CategoryPicker.tsx` to reflect custom categories in real time

**TDD Anchor:**

- Test: `expenses.service.ts` — creates custom category, creates subcategory under parent, renames, deletes, prevents deleting category with orphaned expenses
- Test: `CategoryManager` — renders all categories, adds new one and it appears, edit flow works

**Done when:** You can add "Freelance Tools" as a new category, add "Software Subscriptions" as its subcategory, and select them when logging an expense.

---

### VS-05: Income Logging with Source Tagging

**Priority:** Critical
**Blocked by:** VS-01

**Scope:**

- SQLite migration: `income` table (id, amount, source, note, date, created_at)
- `income.types.ts`: Income, IncomeSource (salary | freelance | ecommerce)
- `income.service.ts`: create income, get all income, get income by source, get income by date range, get monthly total
- `income.hooks.ts`: `useIncomeLog` (form state, validation, submit), `useIncomeHistory` (fetch, filter)
- `IncomeLogScreen.tsx`: form with amount, source picker (Salary / Freelance / E-commerce), optional note, date
- `IncomeSourcePicker.tsx`: visual selector for income source
- `app/income/log.tsx`: thin route

**TDD Anchor:**

- Test: `income.service.ts` — creates income, filters by source, calculates monthly total correctly with mixed sources
- Test: `IncomeLogScreen` — renders form, requires source selection, calls service on submit

**Done when:** You can log "350,000 FCFA — Salary" and "75,000 FCFA — Freelance" and see both in a history list tagged by source.

---

### VS-06: Budget Allocation System

**Priority:** Critical
**Blocked by:** VS-03, VS-05

**Scope:**

- SQLite migration: `allocations` table (id, month, emergency_fund_pct, savings_pct, projects_pct, expenses_pct, priority_order, created_at)
- `budget.types.ts`: Allocation, BudgetBucket, BucketPriority, MonthlyBudget
- `budget.service.ts`: create/update allocation for a month, calculate allocation amounts from income total, get current month allocation, lock allocation per month, get remaining expense budget (total income × expense_pct − total expenses)
- `budget.hooks.ts`: `useAllocation` (current month config, edit percentages), `useBudgetStatus` (remaining budget per category, overall remaining)
- `AllocationSettings.tsx`: UI to set percentages with sliders/inputs, drag-to-reorder priority (emergency → savings → projects → expenses), confirm and lock for the month
- `BudgetOverview.tsx`: category budgets with progress bars showing spent vs. allocated
- `AllocationScreen.tsx`: shown after income is logged — displays how this income will be distributed across buckets, confirm button
- `app/budget/settings.tsx`, `app/(tabs)/budget.tsx`, `app/income/allocate.tsx`: thin routes
- Wire income log flow: after saving income → navigate to allocation screen → confirm → return to dashboard

**TDD Anchor:**

- Test: `budget.service.ts` — percentages must sum to 100, allocation calculates correct amounts from income, remaining budget decreases as expenses are logged, locked allocation can't be edited
- Test: `AllocationSettings` — sliders constrain to 100% total, priority reorder updates state
- Test: `AllocationScreen` — displays correct amounts per bucket, confirm triggers save

**Done when:** You log income of 400,000 FCFA, see it split (10% emergency = 40,000, 10% savings = 40,000, 15% projects = 60,000, 65% expenses = 260,000), confirm, and the budget tab shows 260,000 available for expenses.

---

### VS-07: Quick-Add & Recurring Expenses

**Priority:** Medium
**Blocked by:** VS-03

**Scope:**

- SQLite migration: `quick_add_templates` table (id, label, amount, category_id, subcategory_id), `recurring_expenses` table (id, amount, category_id, subcategory_id, frequency, next_due_date, is_active)
- `expenses.service.ts`: CRUD for quick-add templates, CRUD for recurring expenses, auto-log recurring expenses when due date arrives
- `expenses.hooks.ts`: `useQuickAdd` (template list, one-tap log), `useRecurring` (manage schedules, skip/edit occurrence)
- `QuickAddScreen.tsx`: grid of template buttons (e.g., "Taxi 500", "Lunch 1,500"), tap to log instantly, long-press to edit, add new template button
- `RecurringExpensesScreen.tsx`: list of recurring expenses with next due date, toggle active/inactive, edit amount/frequency
- `app/expenses/quick-add.tsx`, `app/expenses/recurring.tsx`: thin routes
- Background check on app open: if recurring expense due date has passed, auto-log it and advance next_due_date

**TDD Anchor:**

- Test: `expenses.service.ts` — quick-add creates expense from template, recurring auto-logs on due date, skip doesn't log but advances date
- Test: `QuickAddScreen` — renders templates, tap creates expense, long-press opens edit
- Test: recurring logic — monthly recurrence advances correctly, handles month boundaries

**Done when:** You tap "Taxi 500" and it's instantly logged. Rent auto-logs on the 1st of each month. You can skip a recurring expense that didn't happen.

---

### VS-08: Daily Reminder, Zero-Day Confirmation & App Mode

**Priority:** High
**Blocked by:** VS-03

**Scope:**

- `notifications/notifications.service.ts`: schedule local notification, cancel notification, manage notification permissions
- `notifications/notifications.config.ts`: default messages, channel config
- `notifications/triggers/dailyReminder.ts`: schedule end-of-day reminder (configurable time, default 9 PM)
- `notifications/triggers/zeroDayCheck.ts`: if no expenses logged and no zero-day confirmed by reminder time, trigger notification
- `ZeroDayPrompt.tsx`: modal — "Did you spend nothing today?" with Confirm and "Let me log" buttons
- `expenses.service.ts`: add zero-day record (date, confirmed: true), check if today has any logged expenses or zero-day confirmation
- `expenses.hooks.ts`: `useZeroDay` (check status, confirm)
- `auth.service.ts`: add `app_mode` field (learning | control), toggle mode, check if month 1 is complete
- Wire app mode: learning mode hides budget/allocation features, control mode shows everything
- Settings screen addition: configure reminder time, toggle notifications

**TDD Anchor:**

- Test: `dailyReminder.ts` — schedules notification at configured time, cancels previous when rescheduled
- Test: `zeroDayCheck.ts` — triggers only when no expenses AND no zero-day confirmation exist for today
- Test: `ZeroDayPrompt` — confirm creates zero-day record, "let me log" navigates to expense form
- Test: app mode — learning mode hides allocation settings, control mode shows them

**Done when:** At 9 PM you get a reminder. If nothing was logged, you see the zero-day prompt. Learning mode shows only logging features. After month 1, app suggests switching to control mode.

---

### VS-09: Funds — Emergency Fund & Savings

**Priority:** High
**Blocked by:** VS-06

**Scope:**

- SQLite migration: `funds` table (id, type [emergency | savings], target_amount, current_amount, is_target_met, created_at)
- `funds.types.ts`: Fund, FundType, FundGoal
- `funds.service.ts`: create fund, deposit to fund (triggered by allocation), withdraw from fund (emergency use), check if target met, trigger redistribution when target met, get fund progress
- `funds.hooks.ts`: `useFunds` (both funds overview), `useFundProgress` (individual progress), `useRedistribution` (detect target met, recalculate percentages)
- `FundsOverview.tsx`: side-by-side view of emergency fund and savings with progress bars, target amounts, current amounts
- `FundDetail.tsx`: full history of deposits/withdrawals, progress visualization, edit target amount
- `FundProgressBar.tsx`: visual component showing percentage toward goal
- `app/funds/index.tsx`, `app/funds/[id].tsx`: thin routes
- Wire to allocation: when income is allocated, emergency fund and savings receive their portions automatically
- Wire redistribution: when emergency fund target is met, its percentage is proportionally redistributed to savings, projects, and expenses — update `allocations` table

**TDD Anchor:**

- Test: `funds.service.ts` — deposit increases current_amount, withdrawal decreases it, target_met flag triggers at correct threshold, redistribution math is correct (proportional split)
- Test: `FundsOverview` — renders both funds, progress bars reflect correct percentages
- Test: redistribution — emergency at 100% triggers reallocation, new percentages sum to 100

**Done when:** Emergency fund shows "320,000 / 500,000 FCFA — 64%". When target is hit, the 10% emergency allocation automatically redistributes. Savings tracks independently.

---

### VS-10: Project Funding with Timeline

**Priority:** High
**Blocked by:** VS-06

**Scope:**

- SQLite migration: `projects` table (id, name, target_amount, funded_amount, priority_rank, deadline, status [active | completed | paused], created_at)
- `projects.types.ts`: Project, ProjectStatus, TimelineEstimate
- `projects.service.ts`: CRUD projects, deposit to project (from allocation split by priority), calculate estimated completion date (funded_amount + monthly project allocation rate → months remaining), recalculate timeline when allocation changes or emergency withdrawal happens, reorder priority
- `projects.hooks.ts`: `useProjects` (list, CRUD), `useProjectTimeline` (estimates), `useProjectPriority` (drag reorder)
- `ProjectListScreen.tsx`: priority-ranked list with funding progress bars, estimated completion dates
- `ProjectDetail.tsx`: full detail — progress, timeline, funding history, options when disrupted
- `ProjectForm.tsx`: create/edit project (name, target, optional deadline)
- `TimelineRecalcAlert.tsx`: alert modal — "Your e-commerce launch moved from March to April. Options: redistribute from savings, accept delay, reprioritize projects"
- `notifications/triggers/projectTimeline.ts`: trigger alert when timeline shifts beyond a threshold
- `app/projects/create.tsx`, `app/projects/[id].tsx`, `app/(tabs)/projects.tsx`: thin routes
- Wire to allocation: project allocation percentage is split across active projects by priority rank (highest priority gets funded first until complete, then next)

**TDD Anchor:**

- Test: `projects.service.ts` — timeline estimate is accurate given monthly rate, priority reorder changes funding distribution, completed project redistributes to next in line
- Test: `TimelineRecalcAlert` — shows correct old vs. new dates, each option triggers correct action
- Test: priority funding — project ranked #1 gets fully funded before #2 starts receiving

**Done when:** You create "BRVM Investment — 200,000 FCFA" and "E-commerce Launch — 500,000 FCFA". BRVM is priority 1. Monthly project allocation flows to BRVM first. Timeline shows estimated completion. If disrupted, you get an alert with options.

---

### VS-11: People Ledger (Debt Tracking)

**Priority:** Medium
**Blocked by:** VS-01

**Scope:**

- SQLite migration: `debts` table (id, person_name, amount, direction [lent | owed], date, due_date, status [pending | settled], note, created_at)
- `debt.types.ts`: Debt, DebtDirection, DebtStatus
- `debt.service.ts`: create debt, settle debt, get all debts by direction, get overdue debts, get total outstanding (lent and owed separately)
- `debt.hooks.ts`: `useDebts` (list, filter by direction), `useDebtReminders` (check overdue)
- `DebtListScreen.tsx`: two tabs — "Lent" and "Owed" — with person name, amount, due date, status badge
- `DebtDetail.tsx`: full detail, mark as settled button, edit due date
- `DebtForm.tsx`: create new debt entry (person, amount, direction, optional due date, optional note)
- `notifications/triggers/debtDueDate.ts`: remind when due date is approaching (3 days before) and when overdue
- `app/debt/index.tsx`, `app/debt/create.tsx`, `app/debt/[id].tsx`: thin routes

**TDD Anchor:**

- Test: `debt.service.ts` — creates debt, settles it, filters by direction, calculates total outstanding correctly, identifies overdue debts
- Test: `debtDueDate.ts` — triggers 3 days before due, triggers again when overdue, doesn't trigger for settled debts
- Test: `DebtListScreen` — renders both tabs, settled debts show different styling

**Done when:** You log "Lent 15,000 FCFA to Jean, due June 15". It appears in the Lent tab. 3 days before June 15, you get a reminder. If unpaid after June 15, reminder escalates. You tap "Settled" and it moves to completed state.

---

### VS-12: Over-Budget Alerts

**Priority:** High
**Blocked by:** VS-06, VS-03

**Scope:**

- `budget.service.ts`: check if a new expense would exceed category budget, check if total expenses exceed monthly expense allocation
- `budget.hooks.ts`: `useOverBudgetCheck` — called before expense is saved, returns warning data if over
- `OverBudgetAlert.tsx`: warning modal — "This puts you 3,200 FCFA over your Food budget. Proceed anyway?" with Proceed and Cancel buttons
- Wire into `ExpenseLogScreen.tsx` and `QuickAddScreen.tsx`: before saving any expense, run over-budget check → show alert if triggered → user decides
- `notifications/triggers/overBudget.ts`: if user proceeds past the alert, log it for the monthly report

**TDD Anchor:**

- Test: `budget.service.ts` — correctly detects when expense exceeds remaining category budget, correctly detects total monthly overspend
- Test: `OverBudgetAlert` — renders correct overage amount, Proceed saves expense, Cancel returns to form
- Test: integration — logging expense that stays under budget skips alert entirely

**Done when:** You have 5,000 FCFA left in Food. You try to log 8,000 FCFA. Alert says "This puts you 3,000 FCFA over." You can proceed or cancel.

---

### VS-13: Dashboard

**Priority:** High
**Blocked by:** VS-03, VS-05, VS-06, VS-09, VS-10

**Scope:**

- `dashboard.hooks.ts`: `useDashboard` — aggregates: remaining monthly expense budget, emergency fund progress, savings progress, top active project status, today's total spending, quick action shortcuts
- `dashboard.types.ts`: DashboardState
- `DashboardScreen.tsx`: the main overview screen with cards
- `BudgetSummaryCard.tsx`: remaining budget with visual indicator (green/yellow/red based on pace)
- `FundStatusCard.tsx`: mini progress bars for emergency fund and savings
- `QuickActionBar.tsx`: floating or fixed bar with shortcuts — "Log Expense", "Log Income", "Confirm Zero Day"
- `app/(tabs)/dashboard.tsx`: thin route

**TDD Anchor:**

- Test: `useDashboard` — correctly aggregates from multiple services, handles empty state (no data yet), handles learning mode (hides budget/fund data)
- Test: `DashboardScreen` — renders all cards, quick actions navigate to correct screens
- Test: budget pace indicator — green when on track, yellow when 75%+ spent with days remaining, red when over

**Done when:** Dashboard shows at a glance: "162,000 FCFA remaining this month", emergency fund at 64%, savings at 38%, e-commerce project at 22%. Quick actions let you jump to logging.

---

### VS-14: Weekly & Monthly Reports with Charts

**Priority:** Medium
**Blocked by:** VS-03, VS-05, VS-06, VS-09, VS-10, VS-11

**Scope:**

- Install and configure chart library (react-native-chart-kit or Victory Native)
- `reports.types.ts`: WeeklyReport, MonthlyReport, Trend, Comparison
- `reports.service.ts`: generate weekly report (total spent, top categories, highest spending days), generate monthly report (full income vs. expense, allocation performance, category breakdown, fund progress, project progress, debt summary), month-over-month comparison (per-category delta, percentage change), trend detection ("Food up 18% over 2 months")
- `reports.hooks.ts`: `useWeeklyReport`, `useMonthlyReport`, `useComparison`
- `WeeklyReport.tsx`: summary cards + simple chart
- `MonthlyReport.tsx`: comprehensive report with sections for each data area
- `MonthComparison.tsx`: side-by-side bar charts per category, highlighting increases and decreases
- `SpendingBarChart.tsx`: bar chart component for category comparison
- `SpendingPieChart.tsx`: pie chart component for category breakdown
- `OptimizationSuggestions.tsx`: rule-based suggestions ("Food increased 18% — review eating out expenses")
- `app/reports/weekly.tsx`, `app/reports/monthly.tsx`, `app/(tabs)/reports.tsx`: thin routes

**TDD Anchor:**

- Test: `reports.service.ts` — weekly total matches sum of expenses, monthly allocation performance is accurate (actual vs. planned per bucket), month-over-month delta calculates correctly, trend detection triggers at correct threshold
- Test: `SpendingBarChart` — renders with correct data points, handles empty data gracefully
- Test: `OptimizationSuggestions` — generates suggestion when category increases by >10%, no suggestion when stable

**Done when:** Reports tab shows weekly pulse and monthly deep dive. Bar chart compares this month vs. last. Pie chart breaks down categories. You see "Transport increased 23% — consider alternatives."

---

### VS-15: Supabase Cloud Backup & Sync

**Priority:** Medium
**Blocked by:** VS-02, VS-03, VS-05, VS-06

**Scope:**

- Set up Supabase project (auth, database)
- `services/supabase.ts`: initialize Supabase client, auth helpers (sign up, sign in, sign out — tied to PIN or separate?)
- Supabase schema: mirror all local SQLite tables in Supabase (users, income, expenses, categories, allocations, funds, projects, debts, quick_add_templates, recurring_expenses)
- `services/sync.ts`: local-first sync strategy — all writes go to SQLite first, then push to Supabase in background; on new device setup, pull from Supabase to populate local DB; conflict resolution: local always wins (last-write-wins); track sync timestamps per record
- Sync trigger: on app open (pull), after any write (push), manual "Sync Now" button in settings
- Data recovery flow: new device → PIN setup → authenticate with Supabase → pull all data → ready
- Settings screen: Supabase account setup, sync status indicator, "Sync Now" button, last synced timestamp

**TDD Anchor:**

- Test: `sync.ts` — push sends local changes to Supabase, pull overwrites local with cloud data, conflict resolution picks local, sync only sends records modified after last sync timestamp
- Test: recovery flow — fresh app with Supabase credentials restores all data categories
- Test: offline resilience — writes succeed locally when Supabase is unreachable, sync retries on next app open

**Done when:** You log expenses offline. When back online, data syncs to Supabase. You lose your phone, set up a new one, authenticate, and all your data is restored.

---

## DEPENDENCY GRAPH

```
VS-01 (Scaffold)
├── VS-02 (PIN Auth)
├── VS-03 (Expense Logging) ─────────────┐
│   ├── VS-04 (Category Management)      │
│   ├── VS-07 (Quick-Add & Recurring)    │
│   ├── VS-08 (Daily Reminder & Modes)   │
│   └── VS-12 (Over-Budget Alerts) ◄─────┼── VS-06
├── VS-05 (Income Logging) ──────────────┤
│   └── VS-06 (Budget Allocation) ◄──────┘
│       ├── VS-09 (Funds)
│       ├── VS-10 (Projects)
│       └── VS-12 (Over-Budget Alerts)
├── VS-11 (Debt Tracking)
├── VS-13 (Dashboard) ◄── VS-03, VS-05, VS-06, VS-09, VS-10
├── VS-14 (Reports) ◄── VS-03, VS-05, VS-06, VS-09, VS-10, VS-11
└── VS-15 (Supabase Sync) ◄── VS-02, VS-03, VS-05, VS-06
```

## PARALLEL LANES

These tasks can run simultaneously if using multiple agents:

| Lane A | Lane B | Lane C |
| ------ | ------ | ------ |
| VS-01  | —      | —      |
| VS-02  | VS-03  | VS-11  |
| VS-05  | VS-04  | —      |
| VS-06  | VS-07  | —      |
| VS-09  | VS-08  | —      |
| VS-10  | VS-12  | —      |
| VS-13  | VS-14  | VS-15  |

---

## TASK STATUS TEMPLATE

| Task                          | Status     | Notes |
| ----------------------------- | ---------- | ----- |
| VS-01: Project Scaffold       | ✅ Done    | Scaffold, migration runner, primitives, tab routing, notifications stub. 14/14 tests passing. |
| VS-02: PIN Auth               | ✅ Done    | SHA-256 PIN with random salt, AuthProvider/useAuth context, AuthScreen + Keypad, route gates in (auth) and (tabs) layouts. 26 new tests (40 total passing). |
| VS-03: Expense Logging        | 🔲 Backlog |       |
| VS-04: Category Management    | 🔲 Backlog |       |
| VS-05: Income Logging         | 🔲 Backlog |       |
| VS-06: Budget Allocation      | 🔲 Backlog |       |
| VS-07: Quick-Add & Recurring  | 🔲 Backlog |       |
| VS-08: Daily Reminder & Modes | 🔲 Backlog |       |
| VS-09: Funds                  | 🔲 Backlog |       |
| VS-10: Projects               | 🔲 Backlog |       |
| VS-11: Debt Tracking          | 🔲 Backlog |       |
| VS-12: Over-Budget Alerts     | 🔲 Backlog |       |
| VS-13: Dashboard              | 🔲 Backlog |       |
| VS-14: Reports & Charts       | 🔲 Backlog |       |
| VS-15: Supabase Sync          | 🔲 Backlog |       |
