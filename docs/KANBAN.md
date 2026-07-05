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

### VS-16: Transaction UX Enhancement

**Priority:** High
**Blocked by:** VS-03, VS-05, VS-08

**Scope:**

Shared infrastructure (root folders):

- `components/ScreenHeader.tsx`: reusable header row with a back/cancel chevron (`router.back()`), a title slot, and an optional right-action slot. Form screens receive a `cancelLabel` prop (renders "Cancel" instead of "‹") to signal that navigating back discards unsaved data.
- `services/transactions.ts`: `getTransactionFeed(monthISO: string): TransactionEntry[]` — unified query that JOINs the `expenses` and `income` tables, returns rows sorted newest-first within the month. Each row carries a `type: 'expense' | 'income'` discriminator plus the relevant fields (amount, category/source label, date).
- `types/transactions.ts`: `TransactionEntry` union type (`ExpenseEntry | IncomeEntry`) consumed by the feed service and `TransactionList`.

Navigation — back buttons:

- Apply `ScreenHeader` to every pushed (non-tab) screen. Form screens use `cancelLabel`: `/expenses/log`, `/income/log`, `/debt/create`, `/projects/create`. Detail and list screens use the default back chevron: `/expenses/quick-add`, `/expenses/recurring`, `/expenses/categories`, `/income/allocate`, `/budget/settings`, `/settings`, `/debt/[id]`, `/projects/[id]`, `/funds/index`, `/funds/[id]`.

Settings relocation:

- `app/(tabs)/_layout.tsx`: enable tab headers (`headerShown: true`). Add a `headerRight` gear icon to all five tabs that navigates to `/settings`.
- Remove the "Settings" compact button from `TransactionsScreen` FAB.

Transaction list redesign — `TransactionList.tsx`:

- Replace `FlatList` with `SectionList`. Sections keyed by ISO date string (YYYY-MM-DD). Section header: formatted date label (e.g., "Today", "Yesterday", or "Mon 9 Jun") on the left + day net total (expenses − income) on the right.
- Each row: colored left border (green = income, `TEXT_MUTED`-tinted = expense) + label (category name for expenses, income source for income) + amount right-aligned (green for income, default for expense).
- Date removed from per-row display (it now lives in the section header).

Month-scoped feed:

- Default scope: current calendar month (`monthISO = YYYY-MM`). A prev/next arrow pair in the list header navigates months. `useTransactions` hook updated to accept `monthISO` param and call `services/transactions.getTransactionFeed(monthISO)`. Existing category chip filter retained; it filters within the selected month.

Transactions FAB rationalization:

- Remove compact buttons: Recurring, Debts, Settings. Log Income is removed from this bar entirely — income logging remains on the Dashboard `QuickActionBar`, where the effect (budget pace update, fund deposits) is immediately visible.
- Retain compact button: Quick Add.
- Retain primary button: + Log Expense.
- In `explicit` style: Quick Add (compact) + Log Expense (primary) — both always visible.
- In `speed_dial` style: a single "+" FAB expands to two labelled options: Log Expense, Quick Add.

Category icons:

- `constants/categoryIcons.ts`: maps each default category id to an `Ionicons` icon name (from `@expo/vector-icons`, already bundled with Expo). Also maps the three income sources (`salary`, `freelance`, `ecommerce`) to icons. Exports a `getTransactionIcon(type, categoryId?, source?)` helper that returns the icon name, and a `getCategoryAvatar(name)` helper that returns a background color + first-letter string for custom categories without a mapped icon.
- Default icon mapping (illustrative): Food → `restaurant-outline`, Transport → `car-outline`, Bills → `receipt-outline`, Health → `medkit-outline`, Entertainment → `film-outline`, Education → `book-outline`, Shopping → `bag-outline`, Other → `ellipsis-horizontal-outline`. Income sources: Salary → `briefcase-outline`, Freelance → `laptop-outline`, E-commerce → `storefront-outline`.
- `TransactionList.tsx`: each row renders a small icon (22px) left of the label, using the mapped `Ionicons` icon or the color-letter avatar for unmapped custom categories.
- `QuickAddScreen.tsx`: each template tile renders the icon for its mapped category above the label.
- `CategoryPicker.tsx`: each category row in the picker modal shows its icon beside the name.

Action bar style preference (migration + settings):

- Migration 015: `ALTER TABLE users ADD COLUMN action_bar_style TEXT NOT NULL DEFAULT 'explicit'`. Valid values: `'explicit'` | `'speed_dial'`.
- `auth.service.ts`: add `getActionBarStyle()` and `setActionBarStyle(style: 'explicit' | 'speed_dial')`.
- `auth.hooks.ts`: add `useActionBarStyle()` hook.
- `auth.types.ts`: add `ActionBarStyle` type.
- `SettingsScreen.tsx`: new "Action bar style" section with two selectable options — "Explicit buttons" (default) and "Speed dial". Selection persists via `setActionBarStyle`.
- `TransactionsScreen.tsx`: reads `useActionBarStyle()` and renders the corresponding bar variant.

**TDD Anchor:**

- Test: `transactions.service.ts` — feed returns merged income + expense rows sorted newest-first for a given month; expense rows carry `type: 'expense'`; income rows carry `type: 'income'`; returns empty array for a month with no data.
- Test: `TransactionList` — renders section headers with correct date labels; income row has green left-border indicator; expense row has muted indicator; month navigation rerenders with entries for the navigated month; category chip filter applies within the selected month.
- Test: `ScreenHeader` — renders back chevron and title; pressing chevron calls `router.back()`; renders `cancelLabel` when provided; renders optional right action when provided.
- Test: `auth.service.ts` — `getActionBarStyle` returns `'explicit'` before first set; returns the updated value after `setActionBarStyle`; rejects unknown style values.
- Test: `TransactionsScreen` — renders Quick Add compact button and Log Expense primary button when style is `'explicit'`; renders single "+" FAB when style is `'speed_dial'`; does not render a Log Income button in either style.
- Test: `getTransactionIcon` — returns the correct `Ionicons` name for each default category id and each income source; returns `null` for an unknown id (signals fallback to avatar).
- Test: `TransactionList` — expense rows render the mapped category icon; income rows render the mapped source icon; a custom-category expense row renders the letter-avatar fallback.
- Test: `QuickAddScreen` — template tiles render the icon for their mapped category.

**Done when:** The Transactions tab shows income and expenses together, grouped by date with section headers, scoped to the current month by default with prev/next navigation. Each row has a colored left border distinguishing income from expense, plus a category/source icon. Quick Add tiles show category icons. The category picker shows icons beside names. The FAB shows Quick Add (compact) + Log Expense (primary) in explicit mode, or a speed-dial "+" expanding to Log Expense and Quick Add in speed-dial mode. Log Income is accessible from the Dashboard only. A gear icon in every tab header opens Settings. Settings has an "Action bar style" option. Every pushed screen has a back or cancel button. All tests pass.

---

### VS-17: Expense Edit & Delete

**Priority:** High
**Blocked by:** VS-16

**Scope:**

- `expenses.service.ts`: add `updateExpense(id: number, fields: Partial<Pick<Expense, 'amount' | 'categoryId' | 'subcategoryId' | 'note' | 'date'>>): Promise<void>` and `deleteExpense(id: number): Promise<void>`. Both throw if the id does not exist.
- `expenses.hooks.ts`: add `useExpenseEdit(id: number)` hook — loads the expense by id on mount, exposes `update(fields)` and `remove()` handlers, returns loading/error state.
- `ExpenseDetailScreen.tsx`: pre-filled edit form. Identical layout to `ExpenseLogScreen` but initialised with the existing expense's values. Includes a "Delete" danger button below the form. Save calls `updateExpense`; after success, navigates back. Delete opens a confirmation `Modal`; on confirm, calls `deleteExpense` and navigates back. The over-budget check (`useOverBudgetCheck`) runs on save if the amount changed.
- `ExpenseDetailRoute.tsx`: reads `id` from `useLocalSearchParams`, validates it (positive integer), renders `ExpenseDetailScreen(expenseId)` or an error state for invalid id. Follows the same `*DetailRoute` pattern used by `DebtDetailRoute`, `ProjectDetailRoute`, and `FundDetailRoute`.
- `app/expenses/[id].tsx`: thin route rendering `ExpenseDetailRoute`.
- `TransactionList.tsx` (update): expense rows gain `onPress={() => router.push(`/expenses/${item.id}`)}`. Income rows remain non-tappable (income edit is deferred — reversing an allocation requires dedicated scope).

**TDD Anchor:**

- Test: `expenses.service.ts` — `updateExpense` persists changed fields and the updated row is returned on the next fetch; `deleteExpense` removes the record so it no longer appears in any query; both throw for a non-existent id.
- Test: `useExpenseEdit` — loads expense data on mount; `update` triggers re-fetch with new values; `remove` triggers re-fetch and the id is no longer present.
- Test: `ExpenseDetailScreen` — renders with pre-filled amount, category, note, date; save button is disabled until amount and category are present; save calls `updateExpense` with changed fields; delete button opens a confirmation modal; confirming deletion calls `deleteExpense` and navigates back; cancelling deletion closes the modal without calling `deleteExpense`.
- Test: `ExpenseDetailRoute` — renders error state for id = 0 or NaN; renders `ExpenseDetailScreen` for a valid positive integer id.

**Done when:** Tapping an expense row in the Transactions tab opens a pre-filled edit form with a back button. You can correct any field and save. Saving re-runs the over-budget check if the amount changed. You can delete the expense with a one-step confirmation. Income rows in the feed are not tappable. All tests pass.

---

### VS-18: Accounts & Payment Channels

**Priority:** High
**Blocked by:** VS-16, VS-17

**Scope:**

New feature slice — `src/features/finance/accounts/`:

- `accounts.types.ts`: `AccountType = 'cash' | 'mobile_money' | 'bank' | 'card'`. `AccountPurpose = 'spending' | 'saving' | 'emergency' | 'general'`. `Account` (id, name, type, purpose, openingBalance, isDefault, isActive, createdAt). `Transfer` (id, fromAccountId, toAccountId, amount, date, note, createdAt). `AccountStats` (accountId, monthISO, totalIncome, totalExpenses, incomePercent, expensePercent).
- `accounts.service.ts`: `getAccounts()`, `getAccountById(id)`, `createAccount(fields)`, `updateAccount(id, fields)`, `hideAccount(id)` (soft-delete, is_active = false), `setDefaultAccount(id)` (clears previous default first), `getAccountBalance(id)` — computed, never stored: `opening_balance + SUM(income WHERE account_id) − SUM(expenses WHERE account_id) + SUM(transfers WHERE to_account_id) − SUM(transfers WHERE from_account_id) − SUM(fund_transactions WHERE account_id AND type='deposit') − SUM(project_transactions WHERE account_id AND type='contribution')`. Automated allocation deposits carry no account_id and are excluded. `getAccountStats(id, monthISO)` — income % and expense % of that month's totals across all accounts. `logTransfer(fromId, toId, amount, date, note)`. `getTransfers(monthISO)`.
- `accounts.hooks.ts`: `useAccounts()`, `useAccountDetail(id)`, `useAccountStats(id, monthISO)`, `useTransferLog()`.
- `AccountsOverview.tsx`: one card per active account — account name, type icon (Ionicons: cash → `cash-outline`, mobile\_money → `phone-portrait-outline`, bank → `business-outline`, card → `card-outline`), computed balance, purpose badge, this-month income % and expense %. "Add account" button. Tap card → AccountDetail.
- `AccountDetail.tsx` + `AccountDetailRoute.tsx`: balance hero. Stats row (month income %, expense %). Scrollable transaction history filtered to this account: income credits, expense debits, transfers in/out, manual fund contributions out, manual project contributions out — each entry shows type icon, label, amount, date. Edit button → AccountForm (edit mode).
- `AccountForm.tsx`: name input (required), type picker with icons, purpose picker, optional opening balance input labelled "Current balance — leave blank to start from 0", set-as-default toggle. Used for both create and edit.
- `AccountPicker.tsx`: modal listing active accounts with type icon and a default marker ("✓ Default"). Accepts `value: number | null` and `onChange: (id: number) => void`. Used by ExpenseLogScreen, ExpenseDetailScreen, IncomeLogScreen, TransferLogScreen, FundDetail, ProjectDetail.
- `TransferLogScreen.tsx`: from-account picker (defaults to is\_default account), to-account picker, amount input, date (defaults today), optional note. Validates that from ≠ to. Save calls `logTransfer` and navigates back.

Migrations:

- Migration 018: create `accounts` table. Seed three rows: `{ name: 'Cash', type: 'cash', purpose: 'spending', opening_balance: 0, is_default: 1 }`, `{ name: 'MTN MoMo', type: 'mobile_money', purpose: 'general', opening_balance: 0, is_default: 0 }`, `{ name: 'Orange Money', type: 'mobile_money', purpose: 'general', opening_balance: 0, is_default: 0 }`.
- Migration 019: add nullable `account_id INTEGER REFERENCES accounts(id)` to `expenses`, `income`, `fund_transactions`, `project_transactions`. Existing rows get NULL (legacy; no account associated).
- Migration 020: create `transfers` table (id INTEGER PRIMARY KEY, from\_account\_id INTEGER NOT NULL REFERENCES accounts(id), to\_account\_id INTEGER NOT NULL REFERENCES accounts(id), amount INTEGER NOT NULL, date TEXT NOT NULL, note TEXT, created\_at TEXT NOT NULL).

Routes:

- `app/accounts/index.tsx` → thin route, renders `AccountsOverview`.
- `app/accounts/[id].tsx` → thin route, renders `AccountDetailRoute`.
- `app/accounts/create.tsx` → thin route, renders `AccountForm` in create mode.
- `app/transfers/log.tsx` → thin route, renders `TransferLogScreen`.

Updates to existing code:

- `ExpenseLogScreen.tsx` + `ExpenseDetailScreen.tsx`: add optional `AccountPicker` (defaults to is\_default account). Passes selected `accountId` to `createExpense` / `updateExpense`.
- `IncomeLogScreen.tsx`: add optional `AccountPicker` (defaults to is\_default).
- `QuickAddScreen.tsx` template form (`QuickAddTemplateForm.tsx`): add account field so each template carries a default account.
- `FundDetail.tsx`: manual deposit section adds `AccountPicker` labelled "From which account?".
- `ProjectDetail.tsx`: manual contribution section adds `AccountPicker`.
- `TransactionsScreen.tsx`: FAB updated — explicit mode: Quick Add (compact) | Transfer (compact) | + Log Expense (primary); speed-dial mode: expands to Log Expense, Quick Add, Log Transfer. Transfer button navigates to `/transfers/log`.
- `services/transactions.ts` (VS-16): `getTransactionFeed` extended to join and include transfers. `TransactionEntry` union type extended with `TransferEntry` (type: `'transfer'`, fromAccountName, toAccountName, amount, date).
- `TransactionList.tsx`: transfer rows render with `⇄` icon, "Cash → MTN MoMo" label, amount. Expense and income rows gain a small account name chip (omitted when `account_id` is null — legacy records before VS-18).
- `DashboardScreen.tsx`: add a compact "Wallets" section below the budget summary — one row per active account showing name and live balance. Tap navigates to `/accounts`.
- `expenses.service.ts`: `createExpense` + `updateExpense` accept optional `accountId`.
- `income.service.ts`: `createIncome` accepts optional `accountId`.
- `funds.service.ts`: manual deposit function accepts optional `accountId`, stored on the `fund_transactions` row.
- `projects.service.ts`: `contributeManually` accepts optional `accountId`, stored on the `project_transactions` row.

Approved cross-feature edges to add (ARCHITECTURE.md + CLAUDE.md):

- `expenses` → reads from `accounts` (AccountPicker in ExpenseLogScreen and ExpenseDetailScreen)
- `income` → reads from `accounts` (AccountPicker in IncomeLogScreen)
- `funds` → reads from `accounts` (AccountPicker in FundDetail manual deposit)
- `projects` → reads from `accounts` (AccountPicker in ProjectDetail manual contribution)
- `dashboard` → reads from `accounts` (Wallets summary section)

**TDD Anchor:**

- Test: `accounts.service.ts` — migration seeds Cash, MTN MoMo, Orange Money correctly; `getAccountBalance` correctly sums income credits, expense debits, transfers in/out, manual fund contributions, and manual project contributions while excluding automated allocation deposits (null account\_id rows); `logTransfer` creates the transfer record; `getAccountStats` returns correct income/expense percentages for a month where multiple accounts are active; `setDefaultAccount` clears the previous default before setting the new one; `hideAccount` removes the account from `getAccounts` but does not delete its transaction history.
- Test: `AccountsOverview` — renders all active accounts with balance and purpose badge; hidden accounts absent; "Add account" navigates to `/accounts/create`; tapping a card navigates to `/accounts/[id]`.
- Test: `AccountDetail` — renders balance and stats; shows income entries, expense entries, transfers, and fund/project contributions for that account only; edit button navigates to `AccountForm` in edit mode.
- Test: `AccountForm` — name is required; type and purpose pickers persist; optional balance defaults to 0 when blank; set-as-default toggle calls `setDefaultAccount`; submit in create mode calls `createAccount`, in edit mode calls `updateAccount`.
- Test: `AccountPicker` — renders active accounts with type icons; default account shows checkmark marker; selecting an account fires `onChange` with its id; hidden accounts not listed.
- Test: `TransferLogScreen` — from and to account pickers are required; selecting the same account for both shows a validation error; amount must be > 0; save calls `logTransfer` with correct params and navigates back.
- Test: `TransactionList` — transfer entries render with `⇄` icon and from→to label; expense rows with non-null account\_id show account chip; expense rows with null account\_id (legacy) render without chip.
- Test: `DashboardScreen` Wallets section — renders one row per active account; balance reflects mock service return; tapping navigates to `/accounts`.

**Done when:** The Dashboard shows a Wallets section with live balances per account. AccountsOverview shows income % and expense % per account for the current month alongside purpose badges. Tapping an account shows its full transaction history. Transfers are logged from the Transactions FAB (explicit and speed-dial modes), appear in the unified feed with a `⇄` icon, and correctly adjust both account balances. Expense, income, manual fund deposit, and project contribution screens have an optional account picker that pre-fills with the default account. Automated allocation deposits do not affect account balances. All tests pass.

---

### VS-19: Deferred Income Allocation (Hold & Unallocated Pool)

**Priority:** High
**Blocked by:** VS-06, VS-09, VS-10

**Scope:**

Make income opt-in to allocation instead of auto-dispatching. Income is logged as **held** until the user deliberately allocates it, so logging income several times a day no longer inflates the spendable expense budget. Supports manually capping expenses at a share of salary (allocate the salary, hold the extra).

- Migration 022: `ALTER TABLE income ADD COLUMN allocation_status TEXT NOT NULL DEFAULT 'allocated'` (+ index). Legacy rows backfill to `allocated`; the service creates new income as `pending`.
- `income.types.ts`: `IncomeAllocationStatus = 'allocated' | 'pending'`; `Income.allocationStatus`; optional on `NewIncome` (defaults `pending`).
- `income.service.ts`: persist/read `allocation_status`; `getPendingIncome()`; `markIncomeAllocated(id)`. `getMonthlyTotal` stays status-agnostic (income history/reports unchanged).
- `budget.service.ts`: the derived expense budget counts only **allocated** income (`getIncomeMonthlyTotal` filters `allocation_status = 'allocated'`).
- `budget.types.ts`: `AllocationDestination` (`expense | fund | project`).
- `budget.hooks.ts`: `useUnallocatedPool()` — loads the pending pool + funds + active projects and exposes `allocate(income, destination)` (deposits to fund/project where applicable, then marks the income allocated; emergency deposit that meets target triggers redistribution once).
- `AllocationScreen.tsx`: takes `incomeId`; **Confirm** marks the income allocated (alongside the existing deposits + lock); new **Hold for later** button leaves it pending and returns to the dashboard. `IncomeEntryPanel`/`IncomeLogScreen`/`AllocationFromIncomeRoute` thread the new income id through the route.
- `UnallocatedPoolScreen.tsx` + `UnallocatedPoolRoute.tsx` + `app/budget/unallocated.tsx`: pool total, list of held income, per-entry destination picker (Expense budget / Emergency / Savings / each active project). `BudgetOverview` surfaces an "Unallocated income" row (with amount) linking to it when the pool is non-empty.
- Sync hardening: `applyCloudRow` omits columns absent from a cloud row, so a row written before this migration restores cleanly (DEFAULT fills `allocation_status`; never null-overwrites on update).

Approved cross-feature edge added (ARCHITECTURE.md + CLAUDE.md): `budget → income` (read held income, mark allocated).

**TDD Anchor:**

- Test: `income.service` — new income defaults `pending`; `getPendingIncome` returns only pending newest-first; `markIncomeAllocated` flips status; `getMonthlyTotal` counts both.
- Test: `budget.service` — `getMonthlyBudget` excludes pending income; counts only allocated.
- Test: `useUnallocatedPool` — totals the pool; allocate→fund deposits then marks allocated (emergency target-met redistributes once); allocate→project contributes; allocate→expense marks allocated with no deposit.
- Test: `AllocationScreen` — Confirm marks the income allocated; Hold leaves it pending and navigates without depositing/locking.
- Test: `UnallocatedPoolScreen` — pool total + entries; empty state; picking a destination calls `allocate`.
- Test: migration 022 backfills existing income to `allocated`.

**Done when:** Logging income lands it in the pool unless you Confirm the split. The Budget tab shows held income and a tap-through pool screen where you send each held amount to the expense budget, a fund, or a project. Logging income several times a day no longer raises the spendable budget. All tests pass.

---

### VS-20: Income Detail & Edit

**Priority:** Medium
**Blocked by:** VS-05, VS-16, VS-19

**Scope:**

Close the feed's last dead end: income rows become tappable and open a detail screen where held income can be corrected or removed before it is allocated. Editing money that has already been dispatched (deposits made, budget counted) stays restricted — reversing fund/project deposits remains out of scope (the VS-17 deferral stands; VS-19's `allocation_status` is what makes this slice tractable).

- `income.service.ts`: `getIncomeById(id)`; `updateIncome(id, patch)` — full edit (amount, source, date, note, accountId) while `allocation_status = 'pending'`; once `allocated`, only metadata (source, note, accountId) may change — amount/date changes are rejected at the service layer; `deleteIncome(id)` — pending rows only, allocated rows are rejected.
- `income.hooks.ts`: `useIncomeEdit(id)` — loads the row, exposes form state + `canSubmit`/`submit`/`remove`, and surfaces the allocated lock so the UI can disable fields.
- `IncomeDetailScreen.tsx` + `IncomeDetailRoute.tsx` (VS-17 `ExpenseDetailRoute` param pattern) + thin `app/income/[id].tsx` route.
- Pending rows: pre-filled form + Delete (confirmation modal) + an "Allocate now" button into the existing `/income/allocate` flow with the row's id and amount.
- Allocated rows: amount and date render read-only with an explanatory line; source/note/account stay editable.
- `TransactionRow.tsx`: income rows gain `onPress` → `/income/{id}` (mirrors expense rows).
- No migration. No new cross-feature edges (routing by path string, not imports).

**TDD Anchor:**

- Test: `income.service` — `getIncomeById` returns the row or null; `updateIncome` edits all fields while pending; rejects amount/date changes once allocated but accepts metadata; `deleteIncome` removes a pending row and rejects an allocated one.
- Test: `useIncomeEdit` — loads the row, submits a patch, `remove` deletes, exposes the allocated lock.
- Test: `IncomeDetailScreen` — pending: pre-filled form saves and deletes with confirmation; allocated: amount disabled and Delete hidden; Allocate-now navigates with id + amount.
- Test: `TransactionList` — tapping an income row pushes `/income/{id}`.

**Done when:** Tapping an income row opens its detail. Held income can be fixed or deleted before allocation, or sent straight into the allocation flow. Allocated income can only have its metadata corrected — its money trail is immutable. All tests pass.

---

### VS-21: Reports Screen Visual Redesign

**Priority:** Medium
**Blocked by:** VS-14

**Scope:**

Presentational redesign of the Reports tab from a supplied mockup — no schema, no new data, no new cross-feature edges. Plan: `issues/ISSUE-020/implementation-plan.md`.

- `ProgressBar`: add a backward-compatible `trackColor` prop (default `BORDER`) for the segmented spent-vs-remaining bar.
- `reports.service.ts`: pure `expenseSpentPct(actual, planned)` helper (clamp 0–100, 0 when planned ≤ 0).
- New `categoryColors.ts` (shared palette + `colorForIndex`) so donut slices and breakdown-row dots match by category position.
- New `SpendingDonutChart.tsx` (react-native-svg arcs + centered total); retire `SpendingPieChart.tsx`.
- `MonthlyReport.tsx`: Income/Expenses card (uppercase labels + vertical divider); Expense Performance segmented bar + "Actual Spending"/"Remaining Budget" relabel (green remaining); category donut + rich rows (dot + icon chip + "% of total"); Funds "% funded" + "of <target> FCFA" + green fill.

**TDD Anchor:**

- Test: `ProgressBar` renders the passed `trackColor`; defaults to `BORDER` when omitted.
- Test: `reports.service` — `expenseSpentPct` rounds, clamps to 100 over-budget, returns 0 when planned ≤ 0.
- Test: `categoryColors` — `colorForIndex` cycles and is stable per index.
- Test: `SpendingDonutChart` renders arcs + center total for data; empty-state for `[]`.
- Test: `MonthlyReport` — segmented bar present, donut center total, category row "% of total" + icon chip, fund "% funded" line.

**Done when:** The Reports tab matches the mockup's four redesigned sections, all existing report data still renders, and the full suite + `tsc` + `/check-arch` are clean.

---

## UX AUDIT (Post-v1 Usability)

Slices VS-23 → VS-31 come from the first-time-user usability audit in
`docs/ux-audit/` (rationale + evidence per issue). They are grouped by theme, not
one-per-finding; each still cuts through every layer it touches. Sequence follows
the audit phases: **Comprehension (23–25) → Consistency (26–27) → Polish (28–30)
→ Refinements (31)**. Audit issue IDs (H1, M4, …) are cross-referenced in each
slice and in `docs/ux-audit/README.md`.

---

### VS-23: First-Run Onboarding Carousel

**Priority:** High — audit H1 (root cause: the app never teaches its model)
**Blocked by:** VS-02 (PIN), VS-08 (app mode / `users` row)
**Plan:** `issues/ISSUE-023/implementation-plan.md`

**Scope:**

- SQLite migration `025_add_onboarding_complete.ts` — add `onboarding_complete INTEGER NOT NULL DEFAULT 0` to `users`; register in `migrations/index.ts`.
- `auth.service.ts` / `auth.types.ts` — add `onboardingComplete` to the SELECT column list + `AppSettings`; `getOnboardingComplete()` / `setOnboardingComplete()`.
- New slice `features/finance/onboarding/` — `OnboardingScreen.tsx` (3–4 skippable panels: log everything → auto-split into buckets → Learning vs Control → optional reminder), `onboarding.hooks.ts`.
- `app/_layout.tsx` — in `AuthGate`, after unlock and before the tabs, render onboarding once when `!onboardingComplete`; persist completion on finish **or** skip.
- Gating stays at the routing layer (mirrors VS-08 decision #2) — the onboarding feature never imports other features.

**TDD Anchor:**

- Test: migration adds the column with default 0; `getAppSettings` returns `onboardingComplete: false` on a fresh row.
- Test: `setOnboardingComplete(true)` persists and survives a re-read.
- Test: `OnboardingScreen` renders each panel, Next advances, Skip on panel 1 fires `onDone`.
- Test: gate shows the carousel when incomplete, renders children (tabs) when complete.

**Done when:** Fresh install → PIN setup → carousel → dashboard; second launch skips the carousel; Skip still marks it complete. Suite + `tsc` + `/check-arch` clean.

---

### VS-24: Dashboard Comprehension — Control-Mode Nudge & Clearer Labels

**Priority:** High — audit H3 + M7
**Blocked by:** VS-08, VS-13 (Dashboard), VS-23 (onboarding sets the frame)
**Plan:** `issues/ISSUE-024/implementation-plan.md`

**Scope:**

- H3: surface a "Ready for budgeting? Switch to Control mode" prompt on the Dashboard Getting-Started card once a Learning-mode user has logged enough (≥ N transactions or ≥ N days), not only in Settings after 30 days. Tapping flips the mode (confirm) or deep-links to the toggle.
- Gating at the routing layer: `dashboard.tsx` already passes `includeBudgetData`; add a second computed prop (e.g. `showControlNudge`) so the dashboard feature keeps its no-auth-import rule.
- M7: rename the "Zero Day" action to self-describing copy ("I spent nothing today") in `QuickActionBar` and align the matching notification/`ZeroDayGate` copy.

**TDD Anchor:**

- Test: dashboard renders the nudge when mode = learning AND the "logged enough" signal is true; hidden otherwise and in control mode.
- Test: tapping the nudge invokes the mode switch / navigation.
- Test: the zero-day action renders the new label; notification copy matches.

**Done when:** A Learning-mode user who has logged a few entries sees a clear switch-to-Control prompt on the dashboard; the zero-day action reads plainly. Suite + `tsc` + `/check-arch` clean.

---

### VS-25: Forgiving Allocation — Editable Split & Pre-Lock Warning

**Priority:** High — audit H4
**Blocked by:** VS-06 (Allocation), VS-19 (Deferred allocation)
**Plan:** `issues/ISSUE-025/implementation-plan.md`

**Scope:**

- `AllocationScreen.tsx` — add an "Adjust split" link that opens `AllocationSettings` (`/budget/settings`) and returns to a refreshed breakdown (the allocation hook already exposes `refresh`).
- First-ever allocation: route the user to set percentages **before** presenting a breakdown, instead of presenting seeded `DEFAULT_ALLOCATION` as final (detect via the freshly-created, never-locked row).
- Make the month-lock consequence explicit **before** Confirm (helper text or confirm dialog: "Confirming locks this split until next month"), not only via the post-hoc locked banner.
- No schema change; no new cross-feature edges (budget → funds/projects/income already approved).

**TDD Anchor:**

- Test: "Adjust split" navigates to settings; returning re-computes the breakdown from updated percentages.
- Test: a first-ever allocation prompts for percentages before showing a breakdown.
- Test: Confirm surfaces the lock warning before committing; Hold path unchanged.

**Done when:** From the allocation screen a user can edit the split and return without losing the in-flight income, and the lock is disclosed before Confirm. Suite + `tsc` + `/check-arch` clean.

---

### VS-26: Unified Add-Transaction Entry Points ✅ Done

**Priority:** High — audit H2 (+ M3 header cleanup)
**Blocked by:** VS-16 (Transaction UX / `AddTransactionSheet`)
**Plan:** `issues/ISSUE-026/implementation-plan.md`

**Scope:**

- Point the Dashboard `QuickActionBar` "Log Expense" / "Log Income" at the same `AddTransactionSheet` (add an `initialSegment` prop) instead of pushing `/expenses/log` and `/income/log` full-screen routes.
- Retire the standalone log routes for day-to-day use (keep only if a deep link/notification needs them); income still continues to the allocation flow on save.
- Verify the sheet can be opened from the dashboard without a cross-feature violation (dashboard → expenses is approved; confirm against `docs/ARCHITECTURE.md`).
- M3 residue: with the standalone forms gone, audit remaining `ScreenHeader` usages so "Cancel" is used only for modal/entry screens and a back chevron for drill-downs.

**TDD Anchor:**

- Test: dashboard "Log Income" opens the sheet on the Income segment; "Log Expense" on Expense.
- Test: no day-to-day path pushes the old full-screen log routes.
- Test: header left-control matches the modal-vs-drill-down rule on the audited screens.

**Done when:** Both add-transaction entry points use one sheet-based pattern; headers follow one rule. Suite + `tsc` + `/check-arch` clean.

---

### VS-27: Consistent App-Mode Gating (Reports)

**Priority:** High — audit H5
**Blocked by:** VS-08, VS-14 (Reports), VS-21 (Reports redesign)
**Plan:** authored on pickup.

**Scope:**

- `app/(drawer)/(tabs)/reports.tsx` — read `useAppMode()` and pass `includeBudgetData` into `MonthlyReport` (mirrors the dashboard route precedent), keeping the reports feature free of the auth import.
- `MonthlyReport.tsx` — in Learning mode show only income/expense/category analytics; hide Expense Performance, Funds, Projects, and allocation comparison.

**TDD Anchor:**

- Test: `MonthlyReport` with `includeBudgetData={false}` omits the budgeting sections and still renders income/expense/category.
- Test: `includeBudgetData={true}` renders the full report (regression).

**Done when:** Learning-mode Reports no longer surfaces empty budgeting sections; Control-mode Reports is unchanged. Suite + `tsc` + `/check-arch` clean.

---

### VS-28: Shared Empty & Loading States

**Priority:** Medium — audit M1 + M2
**Blocked by:** VS-13, VS-14 (screens to migrate)
**Plan:** authored on pickup.

**Scope:**

- New shared `components/EmptyState.tsx` (icon + title + subtitle + optional CTA) and `components/LoadingState.tsx` (single spinner treatment), root infra usable by any feature.
- Migrate Budget, Transactions, and Reports empty cases to `EmptyState` (M1: Reports currently renders a blank scroll view when `report` is null).
- Standardize loading on `LoadingState` (retire bare "Loading…" text on Budget/Reports).
- Use the existing Projects empty state as the visual reference.

**TDD Anchor:**

- Test: `EmptyState` / `LoadingState` render their props and optional CTA.
- Test: Reports shows the empty state (not blank) when there is no data.
- Test: migrated screens render the shared components.

**Done when:** Empty and loading states look and behave consistently across all tabs; Reports has a real empty state. Suite + `tsc` + `/check-arch` clean.

---

### VS-29: Native Time Picker for Reminders ✅ Done

**Priority:** Medium — audit M4
**Blocked by:** VS-08 (Settings / reminder)
**Plan:** `issues/ISSUE-029/implementation-plan.md`

**Scope:**

- New `components/TimeField.tsx` (sibling to `DateField`, wrapping `@react-native-community/datetimepicker`), persisting the same `HH:mm` string.
- `SettingsScreen.tsx` — replace the free-text reminder `TextInput` + on-save validation with `TimeField`; `applyReminderSchedule` unchanged.

**TDD Anchor:**

- Test: `TimeField` emits `HH:mm` for a picked time and seeds from an `HH:mm` value.
- Test: Settings saves the picked time and reschedules; no format-error path remains.

**Done when:** Reminder time is chosen from a native picker; no free-text entry or format error state. Suite + `tsc` + `/check-arch` clean.

---

### VS-30: Navigation Hygiene — Drawer Cleanup & Accounts Discoverability

**Priority:** Medium — audit M5 + M6
**Blocked by:** VS-16, VS-18 (Accounts)
**Plan:** authored on pickup.

**Scope:**

- M5: hide the disabled "Soon" drawer rows (Export, Backup & Restore, Delete & Reset, Help) until they ship — or collapse to a single non-tappable "More coming soon" note. (Backup & Restore being disabled next to working cloud sync is actively confusing.)
- M6: add an Accounts entry point from the Dashboard Wallets card; replace the Projects-header trash icon (reads as "delete this") with an overflow (⋯) menu whose item is "Recently deleted."

**TDD Anchor:**

- Test: the drawer renders no disabled "Soon" rows.
- Test: the Wallets card exposes a tap → `/accounts`.
- Test: the Projects header exposes "Recently deleted" via an overflow menu, not a bare trash icon.

**Done when:** The drawer shows only actionable rows, Accounts is reachable in one tap from the dashboard, and the deleted-projects entry no longer looks destructive. Suite + `tsc` + `/check-arch` clean.

---

### VS-31: UX Refinements — A11y, Undo & Dedup

**Priority:** Low — audit L1–L6 (each individually small)
**Blocked by:** VS-03 (toast/log), VS-14 (month stepper), VS-06 (lock)
**Plan:** authored on pickup. **Note:** L6 (month-lock escape hatch) is a product-design decision — confirm before building; may split into its own slice.

**Scope:**

- L3: add an "Undo" action to the expense success toast (delete the just-created row; `log.submit()` already returns the id) — requires the toast to accept an action + handler.
- L1: pair ambiguous icon-only controls with a short label or clearer glyph (overlaps M6's trash icon).
- L5: add a redundant non-color status cue ("On track" / "Over budget") beside the colored budget-pace bar.
- L4: move `Typography` to a scalable scheme that respects OS text-scaling.
- L2: consolidate the two month-stepper implementations (`TransactionList` inline vs reports `NavArrows`) into one shared component.
- L6 (optional/product call): a confirm-guarded "Unlock / re-plan this month" escape hatch for locked allocations.

**TDD Anchor:**

- Test: the toast "Undo" deletes the logged expense.
- Test: budget status exposes a non-color cue.
- Test: the shared month-stepper is used by both the transactions feed and reports.

**Done when:** The selected refinements ship without regressions; the full suite + `tsc` + `/check-arch` stay clean.

---

## DEPENDENCY GRAPH

```
VS-01 (Scaffold)
├── VS-02 (PIN Auth)
├── VS-03 (Expense Logging) ─────────────┐
│   ├── VS-04 (Category Management)      │
│   ├── VS-07 (Quick-Add & Recurring)    │
│   ├── VS-08 (Daily Reminder & Modes) ──┼──┐
│   └── VS-12 (Over-Budget Alerts) ◄─────┼── VS-06
├── VS-05 (Income Logging) ──────────────┤  │
│   └── VS-06 (Budget Allocation) ◄──────┘  │
│       ├── VS-09 (Funds)                   │
│       ├── VS-10 (Projects)                │
│       └── VS-12 (Over-Budget Alerts)      │
├── VS-11 (Debt Tracking)                   │
├── VS-13 (Dashboard) ◄── VS-03, VS-05, VS-06, VS-09, VS-10
├── VS-14 (Reports) ◄── VS-03, VS-05, VS-06, VS-09, VS-10, VS-11
├── VS-15 (Supabase Sync) ◄── VS-02, VS-03, VS-05, VS-06
├── VS-16 (Transaction UX) ◄── VS-03, VS-05, VS-08
│   ├── VS-17 (Expense Edit & Delete) ◄── VS-16
│   └── VS-18 (Accounts & Payment Channels) ◄── VS-16, VS-17
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
| VS-16  | VS-14  | VS-15  |
| VS-17  | VS-18  | —      |
| VS-18  | —      | —      |

---

## TASK STATUS TEMPLATE

| Task                          | Status     | Notes |
| ----------------------------- | ---------- | ----- |
| VS-23: Onboarding Carousel    | ✅ Done    | First-run onboarding (audit H1, ISSUE-023): migration 025 adds `onboarding_complete` (fresh install → 0/carousel shown; existing install backfilled to 1/skipped) → auth.service `setOnboardingComplete` + `AppSettings.onboardingComplete` → `useAppSettings.completeOnboarding` → presentational `onboarding/` slice (OnboardingScreen 4-panel carousel + OnboardingGate) → gated at the routing layer in `app/_layout` inside `AuthGate`'s unlocked branch (props-injected, no feature→feature edge). code-reviewer APPROVE WITH NITS (no BLOCK). 15 new slice tests (3 migration, 3 service, 1 hook, 5 screen, 3 gate); tsc clean. Pre-existing unrelated failures untouched: MonthlyReport date-driven tests (assert "June 2026" while today is 2026-07-04) + the known-flaky auth CHECK test (passes in isolation). |
| VS-24: Dashboard Comprehension | ✅ Done    | Control-mode nudge + clearer zero-day label (audit H3 + M7, ISSUE-024). H3: `useAppSettings` exposes `daysSinceCreated` (derived via `daysBetween`) → dashboard route computes `showControlNudge = mode === 'learning' && daysSinceCreated >= 7` and passes it as a prop (gating stays at the routing layer, dashboard feature still auth-free) → DashboardScreen renders a "Ready for budgeting? Switch to Control mode" CTA inside the learning-mode Getting-started card that deep-links to `/settings` (Design Decision #1: deep-link, not inline flip). M7: QuickActionBar "Zero Day" → "No spending"; zeroDayCheck notification body reworded to plain language + a `notifications.config` guard test against "Zero Day" jargon. code-reviewer APPROVE WITH NITS (no BLOCK; stale JSDoc + notification body addressed). 7 new tests (4 DashboardScreen nudge, 1 QuickActionBar label, 1 notifications copy guard, 1 daysSinceCreated hook); tsc clean; /check-arch PASS. Pre-existing unrelated failures untouched: MonthlyReport date-driven tests (assert "June 2026" while today is 2026-07-04) + the known-flaky auth CHECK test (passes in isolation). |
| VS-25: Forgiving Allocation   | ✅ Done    | Editable split + first-run redirect + pre-lock disclosure (audit H4, ISSUE-025). budget.service `hasConfirmedAnyAllocation()` (COUNT of locked rows) → budget.hooks `useIsFirstEverAllocation()` → AllocationScreen: first-ever allocation (never confirmed) redirects to `/budget/settings` before showing a breakdown (ref-guarded, single hop; global "ever locked" signal replaces the plan's per-month `createdNow`, which default rows auto-materialised on read would defeat — Design Decision #1), `useFocusEffect(refresh)` recomputes the breakdown on return, "Adjust split" ghost button, persistent "Confirming locks this split until next month." disclosure under Confirm. `month` param wired through a thin `AllocationSettingsRoute` wrapper (AllocationSettings unchanged). No schema change; no new cross-feature edges (budget→funds/projects/income pre-existing). code-reviewer APPROVE WITH NITS (both nits addressed: direct `useIsFirstEverAllocation` unit test + live `month` param). 13 slice tests (3 service, 5 screen, 3 hooks, 2 route); budget folder 89/89; tsc + /check-arch clean. Pre-existing unrelated failures untouched: MonthlyReport date-driven (assert "June 2026" while today is 2026-07-04) + known-flaky auth CHECK test (passes in isolation). |
| VS-26: Unified Add-Transaction | ✅ Done    | One sheet for both add-transaction entry points (audit H2 + M3, ISSUE-026). `AddTransactionSheet` gains an optional `initialSegment` prop (default `'expense'`; the open effect reseeds to it) → `QuickActionBar` "Log Expense"/"Log Income" swap their `router.push('/expenses/log')`/`('/income/log')` for `onLogExpense`/`onLogIncome` callbacks (drops `useRouter`) → `DashboardScreen` mounts a single `AddTransactionSheet` with local `{open,segment}` state and opens it on the matching segment; `onExpenseSaved` refreshes the dashboard aggregates in place, income-save still routes to `/income/allocate` via the sheet. Standalone `app/expenses/log.tsx` + `app/income/log.tsx` routes retained (back the ZeroDayPrompt "Let me log" + deep links); dashboard is now the only remaining `/income/log` pusher removed. M3: dropped `cancelLabel="Cancel"` on `ExpenseDetailScreen` + `IncomeDetailScreen` (drill-downs → back chevron); `AccountForm` made mode-aware (Cancel in create, back chevron in edit drill-down); genuine entry forms (ExpenseLog/IncomeLog/ProjectForm/DebtForm/TransferLog) keep "Cancel". No new cross-feature edge (dashboard→expenses pre-approved, already used for `useZeroDay`). code-reviewer APPROVE (no BLOCK/nits). Tests updated across AddTransactionSheet (8), QuickActionBar (8), DashboardScreen (15), Expense/IncomeDetailScreen (21); 862/870 suite, tsc clean, /check-arch PASS. Pre-existing unrelated failures untouched: 8 MonthlyReport date-driven tests (assert "June 2026" while today is 2026-07-04). |
| VS-29: Native Time Picker     | ✅ Done    | Reminder time picked from a native picker instead of free text (audit M4, ISSUE-029). New shared `components/TimeField.tsx` (sibling to `DateField`, wraps `@react-native-community/datetimepicker` in `mode="time"`; reads/writes a 24h `HH:mm` string, `isHHmm` regex guard falls back to now when empty/malformed, zero-pads on emit, no-emit on dismiss) → `SettingsScreen` swaps the free-text reminder `TextInput` for `TimeField` (drops the `@/components/TextInput` import; keeps the Save button + `saveReminder`→`setReminderTime`/`applyReminderSchedule` unchanged; the format-error path is retired — the `catch` now surfaces only genuine save failures). No migration; no new cross-feature edge (TimeField is shared infra, Settings→components allowed). code-reviewer APPROVE WITH NITS (both actionable nits addressed: act()-clean picker events + seed-to-now assertion). 6 TimeField tests + 2 reworked Settings reminder tests; 870/878 suite, tsc clean, /check-arch PASS. Pre-existing unrelated failures untouched: 8 MonthlyReport date-driven tests (assert "June 2026" while today is 2026-07-04). |
| VS-01: Project Scaffold       | ✅ Done    | Scaffold, migration runner, primitives, tab routing, notifications stub. 14/14 tests passing. |
| VS-02: PIN Auth               | ✅ Done    | Local 4-digit PIN gate: migration 024 adds pin_salt (pin_hash already existed from 008); `utils/pinHash` (expo-crypto SHA-256 + per-install salt, deterministically mocked in jest) → auth.service hasPin/setPin/verifyPin/changePin/clearPin → AuthProvider (in-memory locked/unlocked + 3-strikes→30s cooldown) + useAuthLock → PinKeypad/AuthScreen (first-run setup enter+confirm, unlock with cooldown countdown) → AuthGate hard-gates the route tree in app/_layout (renders nothing until lock state resolves, schedulers mount only when unlocked). ChangePinScreen (current→new→confirm) + /profile/change-pin route. Forgot-PIN recovery (PinRecoveryScreen via a link on the unlock screen): re-authenticate with the cloud account password → `resetPin` (clears PIN, returns to setup) without data loss; users with no cloud backup get a confirm-guarded `resetLocalData` wipe (drops all tables + re-runs migrations to a fresh install) since erasing the protected data is the only safe reset without an identity check. `users` excluded from sync, so the PIN stays device-local. 41 PIN/profile/recovery slice tests. |
| VS-03: Expense Logging        | ✅ Done    | Tracer bullet: migrations→service→hooks→UI→routes. 51/51 tests passing. |
| VS-04: Category Management    | ✅ Done    | CRUD + hide/reorder + delete-with-reassignment. is_hidden migration. 69/69 tests passing. |
| VS-05: Income Logging         | ✅ Done    | Source-tagged income: migration 004 → service → hooks → picker/screen → route. Inline recent-income list, no edit/delete (VS-05 scope). 26/26 slice tests; 95/95 total. |
| VS-06: Budget Allocation      | ✅ Done    | Migration 005 → service (allocation math, lock-per-month, monthly composition) → hooks → AllocationSettings/Screen/BudgetOverview → routes; income save now navigates to /income/allocate. Approved with nits addressed. 45/45 slice tests; 140/140 total. |
| VS-07: Quick-Add & Recurring  | ✅ Done    | Migrations 006 (quick_add_templates) & 007 (recurring_expenses) → service (quick-add + recurring CRUD, advanceDueDate, idempotent replay-safe runRecurringAutoLog with per-row transactions) → useQuickAdd/useRecurring → QuickAddScreen/QuickAddTemplateForm, RecurringExpensesScreen/RecurringExpenseForm, RecurringAutoLogger (root-mount auto-log) → quick-add/recurring routes + Transactions nav links. Approved (no BLOCK; nits addressed). 42/42 slice tests; 182/182 total. |
| VS-08: Daily Reminder & Modes | ✅ Done    | Migrations 008 (users/app-settings) & 009 (zero_days) → notifications service (real Expo Notifications)/config/triggers (dailyReminder, zeroDayCheck) → auth slice (app-mode + reminder settings, AppModeProvider, DailyReminderScheduler, SettingsScreen; PIN deferred to VS-02) → expenses zero-day (confirm/status + useZeroDay + ZeroDayPrompt/ZeroDayGate) → settings route + root-layout composition + learning-mode Budget-tab gating + Transactions Settings link. App-mode gating lives at the routing layer (no feature→feature imports). Approved with nits addressed. 49 slice tests; 231/231 total. |
| VS-09: Funds                  | ✅ Done    | Migrations 010 (funds) & 011 (fund_transactions) → funds.service (getOrCreateFunds seeds emergency target 500k/savings null, deposit/withdraw in single txns, target-met detection, progress) → useFunds/useFundDetail → FundProgressBar/FundsOverview/FundDetail(+Route) → /funds routes + BudgetOverview nav. Allocation confirm now deposits emergency/savings portions and triggers redistributeEmergencyPct once when the emergency target is first met (budget→funds only; funds never imports budget; redistribution split into budget.redistribution.ts to keep budget.service under the 300-line cap). 32 slice tests; 263/263 total. |
| VS-10: Projects               | ✅ Done    | Migrations 012 (projects) & 013 (project_transactions) → projects.service (CRUD, reorderPriority, priority-cascade fundProjects with per-project txns, contributeManually) + pure projects.timeline.ts (estimateTimeline/detectShift) → useProjects/useProjectDetail (rate from budget breakdown) → ProjectListScreen/ProjectForm/ProjectDetail(+Route)/TimelineRecalcAlert → projectTimeline notif trigger → /projects routes (tab + create + [id]). Allocation confirm now funds projects by priority after funds deposits. Added `budget → projects` to the approved cross-feature table (ARCHITECTURE.md + CLAUDE.md); projects→budget only, projects never imports funds/income/expenses; addMonths added to utils. Edit/delete service fns covered; UI for them deferred. 43 slice tests; 303/303 total. |
| VS-11: Debt Tracking          | ✅ Done    | Self-contained people ledger: migration 014 (debts) → debt.service (create/settle-idempotent/update/delete, getOutstandingTotals, getDueReminders dueSoon/overdue via new `daysBetween` util) → useDebts/useDebtDetail/useDebtReminders (on-open cancel-then-schedule reminders) → DebtListScreen (Lent/Owed tabs)/DebtForm/DebtDetail/DebtDetailRoute/DebtReminderScheduler → pure debtDueDate trigger → /debt routes + Transactions nav link + root-layout scheduler mount. No cross-feature edges. Approved by code-reviewer (no BLOCK). 36 slice tests; 352/352 total. |
| VS-12: Over-Budget Alerts     | ✅ Done    | Overall expense-budget guard (no per-category table): `checkOverBudget(monthISO, amount)` on top of `getMonthlyBudget`, gated on `allocation.isLocked` (inert in learning mode / before a month is confirmed) → `useOverBudgetCheck` → `OverBudgetAlert` modal + pure `overBudget` trigger (in-app, no push) → pre-save guard wired into ExpenseLogScreen & QuickAddScreen. Added approved cross-feature edge `expenses → budget` (ARCHITECTURE.md + CLAUDE.md). No migration. Approved by code-reviewer (no BLOCK). 16 slice tests; 368/368 total. |
| VS-13: Dashboard              | ✅ Done    | Aggregated overview: today spending, budget pace (green/yellow/red), fund bars, top project, quick-action bar. Learning-mode gate at routing layer. 51/51 slice tests; 419/419 total. |
| VS-14: Reports & Charts       | ✅ Done    | Read-only analytics layer: reports.service (getWeeklyReport, getMonthlyReport, getMonthComparison, generateSuggestions) aggregating over expenses/income/budget/funds/projects/debt (all approved edges, no DB access) → useWeeklyReport/useMonthlyReport with prev/next nav → SpendingBarChart + SpendingPieChart (react-native-chart-kit, mocked in jest), OptimizationSuggestions (single >10%-increase rule), MonthComparison, shared NavArrows → WeeklyReport + MonthlyReport screens → /reports/weekly route + (tabs)/reports = MonthlyReport. Self-contained reports.types (local AllocatedBreakdown, no cross-feature type import). No migration. 35 slice tests; 523/523 total. |
| VS-15: Supabase Sync          | ✅ Done | Decoupled email/password cloud identity (SecureStore session, not PIN-linked) → migration 017 adds uuid/updated_at/sync_status + dirty-marking triggers (with `_sync_guard` + `NEW.uuid IS NULL` loop-suppression) + `sync_meta` cursor to 12 financial tables (users excluded; default categories get deterministic uuids) → services/sync.ts local-first push/pull, last-write-wins (local breaks ties), FK uuid↔local-id round-trip via sync.mapping.ts → useCloudSync + useBackgroundSync (on-open/on-foreground, signed-in-guarded, mounted in _layout) → Settings "Cloud backup" section. Supabase fully mocked in tests; supabase/schema.sql (uuid-keyed, owner-scoped RLS; supersedes the old integer-id schema) for manual server setup. code-reviewer APPROVE (no BLOCK). 523/523 tests (1 pre-existing flaky auth CHECK test unrelated to VS-15). |
| VS-16: Transaction UX Enhancement | ✅ Done | ScreenHeader shared component, Settings gear in tab headers, SectionList date grouping, unified income+expense feed (services/transactions.ts), month-scoped filter with prev/next nav, FAB = Quick Add + Log Expense only (Log Income stays on Dashboard), action bar style preference (explicit/speed-dial) with migration 016 + settings toggle, category icons via Ionicons (constants/categoryIcons.ts) in TransactionList + QuickAddScreen + CategoryPicker. ActionBarStyle lifted to src/types/settings.ts (no cross-feature edge). Blocked by VS-03, VS-05, VS-08. 460/460 tests passing. |
| VS-17: Expense Edit & Delete  | ✅ Done    | getExpenseById + updateExpense + deleteExpense in service, useExpenseEdit hook, ExpenseDetailScreen (pre-filled form + over-budget check on amount increase + delete with confirmation modal), ExpenseDetailRoute, app/expenses/[id].tsx thin route, tappable expense rows in TransactionList (income rows non-tappable). Blocked by VS-16. |
| VS-18: Accounts & Payment Channels | ✅ Done | accounts feature slice (AccountsOverview, AccountDetail+Route, AccountForm, AccountPicker, TransferLogScreen) + accounts.service/balance/hooks/types/accountIcons; migrations 018 (accounts table + seed Cash/MTN MoMo/Orange Money), 019 (account_id nullable on expenses/income/fund_transactions/project_transactions), 020 (transfers table), 021 (sync wiring: accounts/transfers join SYNCED_TABLES + account_id FK mapping in sync.mapping + recreated child update triggers; 017 refactored to export addSyncColumns/createUpdateTrigger/DATA_COLUMNS and skip not-yet-existing tables); getAccountBalance computed from history (opening + income + transfers_in − expenses − transfers_out − manual fund/project deposits; null account_id = automated allocation, excluded); getAccountStats income/expense %; Wallets section on Dashboard (WalletsCard); "Log a transfer" link in the Add-Transaction sheet → /transfers/log; AccountPicker (defaults to is_default) on ExpenseEntryPanel, ExpenseDetailScreen, IncomeEntryPanel, ProjectDetail; transfer (⇄) entries + account chips in unified feed (services/transactions.ts + TransferEntry); cross-feature edges expenses/income/projects/dashboard → accounts (funds → accounts reserved: service-level accountId, manual-deposit UI deferred since fund deposits are allocation-driven). Blocked by VS-16, VS-17. code-reviewer APPROVE WITH NITS (nits addressed: default-set wrapped in txns, redundant ORDER BY dropped, funds edge annotated). 591/592 tests (1 pre-existing flaky auth CHECK test, passes in isolation). |
| VS-19: Deferred Income Allocation | ✅ Done | Income no longer auto-dispatches: migration 022 adds income.allocation_status (DEFAULT 'allocated' backfills legacy; service creates new income 'pending') → income.service getPendingIncome/markIncomeAllocated (getMonthlyTotal stays status-agnostic) → budget.service expense budget counts only allocated income → budget.types AllocationDestination → budget.hooks useUnallocatedPool (loads pool + funds + active projects, allocate() deposits to fund/project then marks allocated, emergency target-met redistributes once) → AllocationScreen takes incomeId, Confirm marks allocated, new "Hold for later" button leaves it pending (incomeId threaded through IncomeEntryPanel/IncomeLogScreen/AllocationFromIncomeRoute) → UnallocatedPoolScreen + Route + app/budget/unallocated.tsx + BudgetOverview "Unallocated income" link. Sync hardened: applyCloudRow omits cloud-absent columns (DEFAULT fills on insert, no null-overwrite on update) so pre-migration cloud rows restore cleanly. Added approved edge budget → income (read held income, mark allocated). Blocked by VS-06, VS-09, VS-10. 663/664 tests (1 pre-existing flaky auth CHECK test, passes in isolation). |
| VS-21: Reports Visual Redesign | ✅ Done | Presentational redesign of the Reports tab (ISSUE-020): ProgressBar gains a backward-compatible `trackColor` prop (default BORDER) for the spent-over-remaining segmented bar → pure `expenseSpentPct(actual, planned)` helper (clamp 0–100, 0 when planned ≤ 0) → shared feature-local `categoryColors` palette + `colorForIndex` (donut slices and breakdown-row dots index by the same amount-desc position so a slice matches its dot) → custom react-native-svg `SpendingDonutChart` with centered TOTAL slot (retires `SpendingPieChart` + its test, the sole caller being MonthlyReport) → MonthlyReport restyle: Income/Expenses card (uppercase labels + hairline vertical divider), Expense Performance segmented bar with "Actual Spending"/"Remaining Budget" (green remaining, red when negative), donut + rich category rows (palette dot + name-keyed icon chip via getTransactionIcon + "% of total"), Funds "% funded" + "of <target> FCFA" + green fill. No schema, no new cross-feature edges (reports→expenses/income/budget/funds/projects/debt are the pre-existing VS-14 reads). All files ≤ 300 lines. 52 reports/ProgressBar tests; full suite green. |
| VS-22: Profile                | ✅ Done    | Local profile on the single `users` row (migration 024 adds display_name/avatar_color/avatar_emoji): auth.profile getProfile/setProfile (partial patch) + useProfile → ProfileAvatar (emoji or name-initials on a palette color, reuses AVATAR_PALETTE from categoryIcons) → ProfileScreen (name, color swatches, emoji presets, live avatar preview, Change PIN entry, shared cloud-account card) → app/profile route + a Profile link atop Settings. Cloud sign-in/out extracted into the reusable CloudAccountCard (testIDPrefix) shared by Settings + Profile. Avatar is rendered on-device (no photo upload). No new cross-feature edges (lives in the auth slice). Built alongside VS-02. |
| VS-20: Income Detail & Edit   | ✅ Done    | Feed's last dead end closed: income rows tappable → IncomeDetailScreen (+Route + app/income/[id].tsx, VS-17 pattern). income.service getIncomeById/updateIncome/deleteIncome with the allocated lock enforced at the service layer — pending rows fully editable & deletable, allocated rows lock amount/date (deposits + budget already counted) and reject deletion, metadata stays editable. useIncomeEdit mirrors useExpenseEdit (no diff machinery). Pending detail offers Allocate-now into the VS-19 flow — persists in-form edits first so deposits never run on unsaved values (code-reviewer BLOCK, fixed + regression-tested) — and confirm-guarded Delete. Plain DELETE, no sync tombstone (VS-17 precedent, documented). No migration; no new cross-feature edges (feed navigates by path string). code-reviewer: APPROVE WITH NITS after BLOCK fix. 695/696 tests (1 pre-existing flaky auth CHECK test, passes in isolation). |
