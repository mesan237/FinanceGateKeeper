# Finance Gatekeeper — Kanban Board (Vertical Slices)

## How to Read This Board

Each task is a **vertical slice** that cuts through every layer: database → service → hooks → UI → route. When a task is done, something works end to end.

Every task follows TDD:

1. **Red:** Write failing tests first (Jest for logic, RNTL for screens).
2. **Green:** Implement until tests pass.
3. **Refactor:** Clean up without breaking tests.

Dependencies are explicit. A task cannot start until its blockers are complete. Tasks with no blockers can run in parallel.

A slice marked **⏸ Parked** shipped and then left `main` — the feature was built
for a need the user does not yet have. Its code is preserved in full on the
branch named in the parking slice, and the schema it created is still in the
database, so parking is reversed by merging that branch back rather than by
rebuilding. Parked slices stay on this board as history, not as backlog.

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

### VS-06: Budget Allocation System ⏸ Parked (VS-34)

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

### VS-08: Daily Reminder, Zero-Day Confirmation & App Mode ⏸ App-mode half removed (VS-34)

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

### VS-09: Funds — Emergency Fund & Savings ⏸ Parked (VS-34)

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

### VS-10: Project Funding with Timeline ⏸ Parked (VS-34)

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

### VS-19: Deferred Income Allocation (Hold & Unallocated Pool) ⏸ Parked (VS-34)

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

### VS-25: Forgiving Allocation — Editable Split & Pre-Lock Warning ⏸ Parked (VS-34)

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

### VS-32: Export & Import Data (Local Backup File) ✅ Done

**Priority:** Medium — user-requested (not from ux-audit)
**Blocked by:** none
**Plan:** `issues/ISSUE-030/implementation-plan.md`

Local JSON backup export/import, independent of Supabase cloud sync: `services/dataTransfer.service.ts` — `exportData()`/`importData()` dump/restore every row of every `SYNCED_TABLES` table (the existing sync scope; `users`/PIN excluded) verbatim (same `id`/`uuid`/`sync_status` — a true snapshot restore, not a re-sync). Import is destructive (delete-then-restore, not a merge) and runs inside a single SQLite transaction — a malformed row partway through rolls the whole device back to its pre-import state instead of leaving a half-wiped database (added after `code-reviewer` flagged the initial non-transactional version). Explicit-id inserts into `INTEGER PRIMARY KEY AUTOINCREMENT` columns already advance SQLite's own high-water mark, so no manual `sqlite_sequence` fix-up is needed (verified empirically against `better-sqlite3`). New `expo-file-system`/`expo-sharing`/`expo-document-picker` dependencies → `features/finance/dataTransfer/` slice (`DataTransferScreen.tsx` Export + confirm-guarded Import, `dataTransfer.hooks.ts`) → `app/data-transfer.tsx` route; drawer's disabled "Export records" row is now a live "Export & Import" row (`Backup & Restore` untouched, VS-30's scope). No cross-feature imports. code-reviewer APPROVE WITH NITS (transaction-safety nit addressed with a regression test + fix; a `.claude/settings.json` permissions bundling nit left for the commit split). 21 new slice tests; 911 total. One additional test (`importData` rollback-on-failure) joins the pre-existing "known-flaky CHECK/NOT-NULL-constraint assertion under full-suite load" category (same symptom as the documented auth CHECK flake — passes reliably in isolation, occasionally intermittent full-suite runs hit either that test or this one, never both).

---

### VS-33: Monthly Budgeting Redesign — Envelopes, Pacing & Insights

**Priority:** High — user-requested
**Blocked by:** VS-06 (Allocation), VS-12 (Over-budget), VS-14 (Reports patterns)
**Plan:** `issues/ISSUE-031/implementation-plan.md`

**Scope:**

Turn the Budget tab from a record of income allocation into a place a month is
actually planned.

- **Data model.** Migration 026 `category_budgets` (month, category_id,
  allocated_amount, rollover_enabled, `UNIQUE(month, category_id)`); 027 adds a
  nullable `allocations.total_budget` (NULL = derive from the income split, so no
  backfill); 028 wires both into cloud sync.
- **Hybrid total.** Explicit per-month budget when set, the derived income-split
  figure otherwise. The split still drives funds/projects untouched.
- **Per-category envelopes**, never month-locked — the lock governs money that has
  already moved, not a spending plan.
- **Per-category opt-in rollover.** Leftover *and* overspend carry cumulatively;
  gated on the receiving month's flag; the chain is replayed from history rather
  than stored, so correcting an old month propagates forward.
- **Pacing over thresholds.** `budgetHealth` projects the run-rate rather than
  only testing a percentage, so 45% consumed on the 6th reads as at-risk.
- **Planner** (`/budget/plan`) built around a sticky Unassigned figure that the
  user drives to zero, with income-split / last-month / my-averages shortcuts and
  a "+ rest" control for the final remainder.
- **Budget tab redesign**: month stepper, hero (remaining, paced meter, status
  *word*, days left / safe daily spend / projection), unassigned strip, envelope
  rows, collapsible insights, demoted income-split card as one stacked
  composition bar (the old per-bucket bars plotted share-of-income and always
  summed to 100% across rows — they read as progress toward a goal that did not
  exist).
- **Fixes a live staleness bug**: the tab never refreshed on focus, so figures
  went stale the moment an expense was logged elsewhere.
- **Per-category over-budget guard** finally delivers VS-12's promised copy
  ("3,000 over your Food budget"), and overspending offers to cover from another
  envelope rather than only warning.
- Shared infra: `utils/monthMath` (moved out of `dashboard.service`, which
  `budget` may not import), `EmptyState`/`LoadingState`/`Skeleton` (closes VS-28),
  `MonthStepper` (closes audit L2), `ProgressBar` pace marker; status words close
  audit L5.

**TDD Anchor:**

- Test: `monthMath` — elapsed/remaining/progress across month boundaries, leap February.
- Test: `budget.progress` — health is at-risk when the projection overshoots even at low
  consumption; carry chain accumulates, resets when the flag is off, carries negative overspend.
- Test: `budget.envelopes` — set is idempotent per (month, category); `moveBudget` conserves
  the total; carry reflects a corrected past month rather than a stale stored balance.
- Test: `budget.plan` — explicit total wins, NULL falls back to derived; unbudgeted spend
  surfaces as a zero-budget envelope and still counts in the month total;
  `checkCategoryBudget` binds regardless of the allocation lock.
- Test: screens — planner drives Unassigned to zero and warns on over-allocation; the tab
  renders the pace marker, the status word, the empty-state CTA, and skeletons.

**Done when:** A user opens Budget on a fresh month, taps one CTA, sets a total,
distributes it watching Unassigned fall to zero, and then sees — per category and
overall — spent, remaining, % consumed, daily average, projected end-of-month, and
an on-track/at-risk/over verdict paced against today.

---

### VS-34: Refocus on the Daily Loop — Park Projects, Funds & the Income Split ✅ Done

**Priority:** High — user-requested, reorients the product
**Blocked by:** VS-33 (Envelopes — the budget feature this slice promotes to default)
**Plan:** `issues/ISSUE-032/implementation-plan.md`
**Preserved on:** `feat/parked-projects-funds-allocation`

**Scope:**

Cut the app down to what is actually used every day — log a transaction, budget
by category, read the reports — and park the rest on a branch rather than
deleting it.

- **Level B extraction.** Routes, screens, shared-read sections, and the
  `projects` and `funds` slice folders leave `main`. **Migrations, DB tables and
  `sync.mapping.ts` are untouched** — an unread `projects_pct` column costs
  nothing, while a schema migration would invalidate every existing export file
  and is the one part of this change that cannot be walked back.
- **The income split is parked with them**: the post-income allocation screen,
  the percentage settings, the month lock, the held-income pool, and emergency
  redistribution. Income now logs straight through in two taps.
- **The Budget tab is ungated.** VS-33's envelopes shipped behind
  `appMode === 'control'` while every install defaults to `'learning'`, so
  category budgeting has been invisible since it landed. It becomes the default
  experience.
- **The budget total is rebased.** `getMonthlyBudget` derived the month from
  `income × expenses_pct`; with no split, NULL `total_budget` now means "the
  month's total income", with an explicit total still winning. VS-33's hybrid
  design and its tests survive intact — no migration.
- **Removes a trap rather than working around it.** `updateIncome` and
  `deleteIncome` refuse to touch an allocated row, because allocation had moved
  real money into funds and projects. Defaulting new income to `allocated` would
  make every entry permanently uneditable, so the guards are deleted, not
  satisfied — with no allocation there is no downstream deposit to desync.
- **Learning mode is gone** (not just the gate). With budgeting ungated, `appMode`
  gated nothing but its own Settings toggle, whose copy still claimed budgeting
  was hidden. The type, provider, service writer, settings card, the
  `isMonth1Complete` / `daysSinceCreated` signals that fed the nudge, and the
  `includeBudgetData` branch through dashboard hook, service and screen are all
  removed; the app behaves as Control mode always did. The `users.app_mode`
  column stays — unread, defaulted, and outside the sync/export set.
- **Debt stays.** It tracks money actually lent and borrowed.
- Parks VS-06, VS-09, VS-10, VS-19 and VS-25 along with the code.

**TDD Anchor:**

- Test: `income.service` — amount and date can be edited after logging, and a row
  can be deleted; both would have thrown under the old allocation guards.
- Test: `budget.service` — the total derives from the month's income when
  `total_budget` is NULL; an explicit total still wins.
- Test: `budget.plan` — every VS-33 envelope, carry-chain and pacing test passes
  **unmodified**; `checkOverBudget` fires without a locked allocation.
- Test: `accounts.balance` — a wallet holding historical fund deposits and manual
  project contributions reports the same balance after the slice as before it.
  This is the regression that proves Level B was safe to take.
- Test: screens — Budget renders for a `learning`-mode user; Dashboard and
  Monthly Report render with no fund or project sections.

**Done when:** Income logs in two taps with no allocation screen in between,
Budget opens to this month's category envelopes without touching a setting,
Reports shows a category breakdown uninterrupted by funds or projects, and every
wallet balance matches what it showed before the slice.

### VS-35: French Localization ✅ Done

**Priority:** High — user-requested; French is the target user's working language
**Plan:** `issues/ISSUE-033/implementation-plan.md`

**Scope:**

- i18next + react-i18next + expo-localization behind a new shared `src/i18n/`
  folder. Resources are typed TypeScript per namespace, and a missing French key
  fails `tsc`.
- The device language is the default. Settings "Language" row: System /
  Français / English, stored in `users.language` (migration 029, device-local).
- Every screen, shared component, route title and notification reads from the
  catalogue. `formatDate` gets French month and day names.
- Seeded default categories are translated when displayed. User-created names
  display verbatim, and nothing in the database is rewritten.

**TDD Anchor:**

- Test: `resolveLanguage` — override wins; `fr-*` device → fr; unsupported → en.
- Test: `formatDate` — French month/day names; English unchanged.
- Test: `displayCategoryName` — seeded default translated, custom name verbatim.
- Test: fr/en key parity.
- Test: Settings language row persists and switches the rendered language.

**Done when:** A phone set to French opens the whole app in French, the Settings
override switches language without a restart, and every existing English test
still passes.

**Outcome:** i18next + react-i18next + expo-localization behind the new bottom-layer
`src/i18n/` (typed en/fr catalogues per slice, runtime key and placeholder parity
tests, `intl-pluralrules` polyfill). Migration 029 `users.language` + a Settings
System / Français / English control that switches live and re-schedules the daily
reminder. French dates via `i18n/dateNames`; seeded categories translated at display
through `displayCategoryName(name, isDefault)`, never written back. Every slice, the
shell, notifications and service validation errors translated. code-reviewer
APPROVE WITH NITS; fixed: user categories sharing a seeded name ("Courses") are no
longer translated where the row is known, the last English literals, income tint
keyed on the source, placeholder parity. Known limits: label-only views (feed,
reports, budget rows) still name-match; a few values fetched before a language
switch stay in the old language until the next refetch; the plural polyfill and
French label lengths still need a check on a real Android device.

### VS-36: Planned Purchases — Shopping Lists that Become Expenses ✅ Done

**Priority:** High — user-requested; closes the gap before spending
**Plan:** `issues/ISSUE-034/implementation-plan.md`
**Branch:** `feat/vs-36-planned-purchases`

**Scope:**

- New `planned` slice: named lists of items (name, estimated amount, category, optional
  date and account). Migration 030 adds `planned_lists` and `planned_items`.
- Ticking an item opens a confirm sheet with the estimate prefilled; the user confirms
  the actual amount, account and date, and one transaction creates the expense and links
  it. The item shows struck through with the amount actually paid.
- Unticking (after a confirmation) deletes the linked expense and reopens the item.
- **Planned items never affect the budget.** Only the expense created on ticking does.
- No status column: an item is bought exactly when its linked expense exists.
- New approved dependencies: `planned → expenses`, `planned → accounts`.

**TDD Anchor:**

- Test: create/rename/delete lists; an estimate that is zero, negative or fractional is rejected.
- Test: ticking creates one expense with the confirmed amount, and a failure rolls back both writes.
- Test: unticking deletes the expense; deleting the expense elsewhere reopens the item.
- Test: a planned item changes no envelope figure; a bought one changes it like any expense.

**Milestones:** M1 migration + list/item service ✅ · M2 mark/unmark bought ✅ · M3 screens ✅
and routes ✅ · M4 French copy ✅ (landed with M3: the typed catalogue needs it) · M5 sync + export ✅ · M6 arch
check, review, docs ✅.

**Done when:** A user can plan a shopping list, tick items off in the shop and see each
one land in Transactions and the budget with the price actually paid.

**Outcome:** New `planned` slice (migrations 030 + 031, `planned_lists` / `planned_items`, no
status column: bought = the linked expense exists). `markBought` / `unmarkBought` create and
delete the expense in one SQLite transaction and run strictly one after another, so a double
tap or a failed link cannot leave a duplicate or orphaned expense. Lists and items screens,
a purchase sheet that confirms amount / account / date, strikethrough with the price paid,
confirm-before-undo, drawer entry, full EN/FR copy. Planned items never touch the budget; the
over-budget warning is not shown on ticking (the check lives in `budget` and `planned` may not
import it). Both tables sync and export; **the Supabase patch
`supabase/patches/036_planned_purchases.sql` must be run before installing this build**, or every
sync fails. /check-arch PASS; code-reviewer APPROVE WITH NITS, and the should-fix items were
addressed (tick/undo serialised with a double-tap guard, ROLLBACK can no longer mask the real
error, sheet errors shown inside the sheet, price paid no longer struck through). Known limits
left as follow-ups: an unresolved expense link on a sync pull does not self-heal; deleted expenses
are not synced; items keep the parent category only; `createItem` does not check the category or
account exists (it relies on foreign keys, and nothing in `database.ts` turns them on at open, so
that is worth confirming on a device); lists load once on mount rather than on focus; deleting an
item has no confirmation; the purchase sheet can confirm before the default wallet has loaded.

### VS-37: Backup & Restore ✅ Done

**Priority:** High — user-requested; turns the drawer's disabled "Soon" row into a real safety net
**Blocked by:** VS-15 (Cloud sync), VS-32 (Export & Import)
**Plan:** `issues/ISSUE-035/implementation-plan.md`

**Scope:**

- One Backup & Restore screen from the drawer. **Cloud backup:** status, last
  backup, *Back up now*, and *Restore from cloud* (replace this phone's data with
  the cloud copy). **On this phone:** automatic snapshots restorable offline.
- Automatic local snapshots: daily on first open, keep the last 7; manual and
  "before restore" safety copies are kept separately.
- Every restore first takes a "before restore" snapshot, so it can be undone.
- A snapshot restore marks the restored rows pending with a fresh timestamp, so
  the cloud converges on the next sync (the engine sends no deletions; documented).

**TDD Anchor:**

- Test: `snapshots.service` — one daily snapshot per day, pruned to 7, safety
  copies spared.
- Test: snapshot restore replaces data and leaves every row pending.
- Test: `restoreFromCloud` repopulates from the cloud, refuses when signed out,
  and is untouched on a cloud error.
- Test: screen restores through a confirm modal; drawer row opens `/backup`.

**Done when:** The drawer's Backup & Restore row opens a screen where the user
can see when they were last backed up, take a backup, and restore from the cloud
or from any of the last 7 daily snapshots, and every restore can be undone.

**Status:** Done. `services/snapshots.service.ts` writes JSON snapshots to
`documents/backups` (7 daily + 5 manual/before-restore, pruned separately; ids
validated against a strict file-name pattern). `useDailySnapshot` runs on open and
foreground inside the unlocked tree. A snapshot restore reads first, saves a
"before restore" copy (sparing the restored one from pruning), then imports and
marks every row pending in one transaction (`importData(..., { markPendingAt })`),
so the cloud converges despite the engine sending no deletions.
`sync.restoreFromCloud` fetches everything first and refuses with data untouched
when signed out, offline or the cloud is empty, then replaces in one transaction
under the sync guard. New `backup` slice + `/backup` route; drawer row live; en/fr
`backup` namespace. No schema change, no new cross-feature edges. code-reviewer
APPROVE WITH NITS; fixed: one restore at a time on the screen, atomic
restore + pending-marking, restored snapshot never pruned, no double daily snapshot
on cold start. Left as-is: raw cloud error text in the cloud card (same as
`CloudAccountCard`); the first daily snapshot can land during onboarding.

---

### VS-38: Imprévus — Mark and Count Unplanned Expenses ✅ Done

**Priority:** High — user-requested; shows how much of the month went to surprises
**Blocked by:** VS-03 (Expense logging), VS-14 (Reports), VS-15 (Cloud sync)
**Plan:** `issues/ISSUE-036/implementation-plan.md`

**Scope:**

- An "Unexpected" (FR "Imprévu") switch on the expense log and detail screens,
  off by default. It is a flag beside the category, not a category, so an
  unexpected pharmacy bill still counts under Health.
- An amber "Imprévu" badge on flagged rows in the Transactions feed, and an
  "Imprévus" chip that filters the feed down to them.
- A Reports card with the month's imprévus: count, total, share of spending,
  and last month's figures beside them.
- A line on the dashboard's month overview while the month has any.

**TDD Anchor:**

- Test: migration 032 adds `is_unplanned` (default 0) and flagging marks the row pending.
- Test: `createExpense`/`updateExpense` store the flag; `getUnplannedTotals` counts and sums a range.
- Test: the log/detail switch saves the flag; the feed badges and filters imprévus.
- Test: the monthly report and dashboard carry the month's imprévus.

**Done when:** The user can mark an expense as an imprévu when logging or editing
it, spot it in the Transactions list, and read how many imprévus the month had
and what they cost on Reports and the dashboard.

**Status:** Done. Migration 032 adds `expenses.is_unplanned` and rebuilds the
expenses update trigger; Supabase patch 038 (also folded into 037 and
`schema.sql`) must be run before a build with migration 032 syncs. Quick-add
tiles, recurring auto-logs and planned purchases log planned expenses; the user
can flag one afterwards from its detail screen. Expenses logged before this
slice read as planned. No new cross-feature edges (reports and dashboard
already read `expenses`).

---

### VS-39: Planned Purchases — Due Dates, Reminders and the Drawer Dot ✅ Done

**Priority:** High — user-requested; planned purchases were easy to forget
**Blocked by:** VS-36 (Planned purchases)
**Plan:** `issues/ISSUE-037/implementation-plan.md`

**Scope:**

- Every list has a required shopping day; items fall due with it unless they
  carry their own date.
- Due badges on lists and items: "Due in 2 days" / "Due today" (amber),
  "Overdue by 3 days" (red); quiet while the day is further off.
- Postpone an item due soon or overdue: one day, one week, or a picked date.
- Phone reminders: 09:00 three days before, 09:00 on the day, the next 09:00
  while overdue.
- A dot on the drawer's Planned purchases row and on the menu button, and a
  dashboard card, while anything is due soon or overdue.

**TDD Anchor:**

- Test: migration 033 adds `due_date` and changing it marks the list pending.
- Test: `createList`/`setListDueDate` require a date; `getDueItems` dates items by their own date, else the list's.
- Test: `planReminders` schedules the heads-up, the day and the overdue nudge; reconcile replaces only planned reminders.
- Test: the new-list sheet refuses a list without a day; badges, postpone and the dots render from the counts.

**Done when:** A list cannot be created without a shopping day, and as that day
approaches the user is reminded on the phone, sees a dot in the menu and a card
on the dashboard, and can postpone what they will not buy yet.

**Status:** Done. Migration 033 adds `planned_lists.due_date` (nullable: older
lists show "No due date" and ask for one); Supabase patch 039 (folded into 037
and `schema.sql`) must run before a build with migration 033 syncs.
`PlannedReminderScheduler` at the root re-plans reminders on open, foreground and
every planned change, and publishes counts to the shared `AttentionProvider`,
which the drawer, `MenuButton` and `PlannedDueCard` read — no new cross-feature
edges. Reminders mirror the debt ones and do not check the notifications setting.

---

### VS-40: Financial Integrity — Budget Checks, Shared Health, Fixed-Cost Projection 🔄 In Progress

**Priority:** Critical — Phase 1a of the progression plan
**Blocked by:** VS-33 (Envelopes), VS-34 (Refocus)
**Audit:** `docs/finance-gatekeeper-audit/` (FINANCIAL_LOGIC §4.2, §4.6, §4.7, §4.4 copy)

**Scope:**

Fix the budget defects that need no migration and no product decision, before
anything builds on these figures.

- **Edit check counts the old amount twice.** Editing 10,000 → 12,000 was checked
  as +12,000 against a month that already held the 10,000. A pure
  `expenses.budgetDelta.editBudgetDeltas` now hands each check only what the edit
  adds where it lands: the difference when month and category are unchanged,
  the full amount when the expense moves to another category or month.
- **Checks use the expense's own month.** `useOverBudgetCheck` and
  `useCategoryOverBudgetCheck` take an optional month per call; the log panel and
  the detail screen pass the expense's date month, so a back-dated expense is no
  longer checked against today's budget.
- **One health rule.** The dashboard dropped its own 75% threshold and reads the
  Budget tab's `getBudgetOverview` (same total, same carry, same `budgetHealth`),
  mapped to green/yellow/red by `paceFromHealth`.
- **Fixed costs projected once.** `projectSpend`/`budgetHealth` take the month's
  recurring spend (`getFixedSpendByCategory`, `is_recurring = 1`) and extrapolate
  only the variable part; the 80% rule reads the variable budget. Rent on the 1st
  no longer makes the month "at risk".
- **Copy.** The planner no longer promises an "income split" that VS-34 parked.
- `budget.progress.ts` split: the chart series moved to `budget.trend.ts` (300-line rule).

**TDD Anchor:**

- Test: `editBudgetDeltas` — same placement → difference; new category or month → full amount.
- Test: hooks — a month passed to `check` wins over the hook default.
- Test: `ExpenseDetailScreen` — raising 2,000 → 5,000 checks +3,000 in the expense's month.
- Test: `budgetHealth`/`projectSpend` — rent on day 1 stays on track; the variable part still trips the 80% rule.
- Test: `getBudgetOverview` — a recurring 100,000 on the 1st projects 162,000, not 1,612,000.
- Test: dashboard — 40% spent by the 8th is yellow, matching the Budget tab.

**Done when:** an edit or back-dated expense warns only about money it actually
adds to the month it lands in, the Dashboard and Budget tab never disagree on a
month's health, and a month with rent paid on the 1st reads on track.

**Not in this slice (Phase 1b, needs migrations or decisions):** wallets on
recurring and quick-add expenses, dated opening balances, transfer edit/delete,
debt payments that move money, refunds, the averaging divisor and month completeness.

---

### VS-41: Your Typical Month — Fixed vs Variable Spending 🔄 In Progress

**Priority:** High — user-requested; Phase 1b item #6 of the progression plan
**Blocked by:** VS-40 (Financial integrity), VS-38 (Imprévus)

**Scope:**

Three months of real spending, shown so the user can see what is a commitment
and what a new habit could change.

- **Fixed or variable categories.** Migration 036 adds nullable
  `categories.cost_type` (`fixed` | `variable`): null on a parent reads as
  variable, null on a subcategory inherits the parent. The default Bills starts
  fixed. A Fixed/Variable chip on every row of Categories flips it; a
  subcategory flipped back to its parent's type clears its override.
- **Complete months.** `expenses.coverage`: a day counts when it holds an
  expense or a confirmed zero-spend day; a month is complete from 80% of its
  days. A mid-month start or a skipped fortnight is left out, not guessed at.
- **Honest averages.** The planner's "Use my averages" divides by the complete
  months in the window, zeros included — one annual 120,000 bill now suggests
  40,000 a month, not 120,000.
- **Reports card "Your typical month"** for the three months before this one:
  the average month, split fixed / variable / unexpected (imprévus first, then
  recurring bills as fixed, then the category tag); the top variable categories
  with their cheapest and dearest month; and what matching the cheapest month in
  every variable category would keep. Before any month is complete it shows
  how far each month is from counting. Reloads on focus.
- Supabase patch 040 (folded into 037 and `schema.sql`) must be run before a
  build with migration 036 syncs.

**TDD Anchor:**

- Test: migration 036 tags Bills fixed, leaves the rest null, rejects other values, marks a re-tag pending.
- Test: `costTypeResolver` — sub override wins, untagged sub inherits, unknown reads variable.
- Test: `monthCoverage` — 80% threshold; mid-month start incomplete; days counted once.
- Test: `suggestFromHistory` — zeros count; annual bill spread; incomplete months ignored.
- Test: `buildSpendingProfile` — split, recurring as fixed, ranking with range, incomplete months excluded.
- Test: `CategoryManager` chip and `TypicalMonthCard` states; Reports loads the profile on focus.

**Done when:** after a fully logged month, Reports shows what a typical month
costs, how much of it is fixed, which variable categories cost the most and how
much matching the user's own cheapest month would keep — and Categories lets the
user say what is fixed.

---

### VS-42: Wallet Integrity — Template Wallets and Balance Checks 🔄 In Progress

**Priority:** Critical — Phase 1b items #1 and #2 (user choices 1.A, 2.A)
**Blocked by:** VS-41 (stacked branch), VS-18 (Accounts)

**Scope:**

Make wallet balances something the user can trust.

- **Template wallets.** Migration 037 adds nullable `account_id` to
  `quick_add_templates` and `recurring_expenses`; both forms gain the account
  picker, new templates start on the default wallet, and every tap or
  auto-logged occurrence is debited from it. Older templates stay unassigned
  until the user picks one — nothing is guessed.
- **Balance checks.** New synced table `balance_checks` (account, balance,
  difference, date, note, soft-delete `deleted_at`). "Confirm balance" on the
  account screen pins the wallet to what it actually holds; the balance is then
  that figure plus only what happened after it (later date, or same date saved
  later), so back-logging older entries no longer shifts it. The history shows
  each check with the correction it made; tapping one removes it.
- **Unassigned spending.** Accounts says how many expenses (and how much) no
  wallet accounts for, instead of silently leaving them out.
- Migrations 034/035 now skip tables a later migration creates (fresh installs
  run them before `balance_checks` exists).
- Supabase patch 041 (folded into 037 and `schema.sql`) must run before a build
  with migration 037 syncs.

**TDD Anchor:**

- Test: migration 037 — template wallet changes and check soft-deletes mark rows pending; checks get a uuid.
- Test: templates — a tap and each recurring occurrence are logged on the template's wallet; no wallet stays null.
- Test: `getAccountBalance` — confirmed figure + later flows; back-logged older entries ignored; same-day ordering; latest check wins; removal falls back.
- Test: screens — new templates default to the default wallet; edits keep theirs; Confirm balance saves the typed figure; history signs the correction; unassigned card.

**Done when:** rent auto-logged from MoMo lowers the MoMo balance, the user can
tell the app what a wallet really holds and have it stick, and Accounts says
how much spending no wallet covers.

**Known limitation:** once a wallet has a balance check, editing its opening
balance has no effect on the balance (the check supersedes it).

---

### VS-43: Edit and Remove Transfers 🔄 In Progress

**Priority:** High — Phase 1b item #3 (user choice 3.A)
**Blocked by:** VS-42 (Wallet integrity)

**Scope:**

A transfer logged with the wrong amount or wallet used to be permanent.

- Migration 038 adds `transfers.deleted_at`; removal is a soft delete so it
  syncs instead of resurrecting on the next restore. Every read — balances,
  account history, the monthly list, the Transactions feed — skips removed rows.
- `accounts.transfers`: `getTransferById`, `updateTransfer` (validated like a
  new transfer), `removeTransfer`.
- Transfer rows in the feed and in an account's history open
  `/transfers/[id]`: the transfer form pre-filled, with a confirm-guarded Delete.
- Supabase patch 042 (folded into 037 and `schema.sql`) must run before a build
  with migration 038 syncs.

**TDD Anchor:**

- Test: migration 038 — soft delete and edits mark the row pending.
- Test: `updateTransfer` moves both balances; rejects same wallet, bad amount or date, removed transfers.
- Test: `removeTransfer` drops the transfer from balances, history, monthly list and feed, keeping the row.
- Test: screens — edit mode pre-fills and saves; Delete confirms; feed and history rows open the edit route.

**Done when:** a mistaken transfer can be corrected or removed from where the
user sees it, both wallet balances follow, and the change reaches the cloud.

---

### VS-44: Debts That Move Money — Repayments and History 🔄 In Progress

**Priority:** High — Phase 1b item #4 (user choice 4.A)
**Blocked by:** VS-43 (stacked branch), VS-11 (People ledger)

**Scope:**

A debt used to be a note: lending 50,000 from MoMo left MoMo untouched, and
the only repayment was "settled" in one step.

- Migration 039: `debts.account_id` (the account the loan went through) and
  `debts.deleted_at` (soft delete — a debt now moves money, so a resurrected one
  would move it again); new synced table `debt_payments` (debt, amount, account,
  date, note, soft delete).
- Account balances: a loan given lowers its account, a loan received raises it;
  a repayment moves money back. Never income or spending — no budget, average
  or report total reads these tables. Account history names each movement
  ("Lent to Marie", "Repayment from Marie").
- `debt.payments`: record (validated against what is still owed; paying the
  rest settles the debt), list, remove (reopens a settled debt). `settleDebt`
  records the remaining amount as the final repayment.
- Outstanding totals, reminders and the list show what is still owed.
- UI: "Through an account" + account picker on the debt form; the detail
  screen shows repaid / still owed, the repayments (tap to remove) and "Record
  repayment", a sheet that starts from what is still owed.
- New approved edge `debt → accounts` (CLAUDE.md, ARCHITECTURE.md).
- Supabase patch 043 (folded into 037 and `schema.sql`) must run before a build
  with migration 039 syncs.

**TDD Anchor:**

- Test: migration 039 — account and soft delete sync; repayments get a uuid; amounts must be positive.
- Test: `debt.payments` — partial repayment, auto-settle, over-payment rejected, removal reopens.
- Test: `getAccountBalance` — lend/borrow/repay in both directions; no account moves nothing; removals undo.
- Test: screens — form default account and "no account"; repayment sheet; repayment list and removal.

**Done when:** lending from MoMo lowers MoMo, each repayment raises it back,
a debt can be repaid in instalments with its history kept, and none of it
counts as income or spending.

---

### VS-45: Refunds 🔄 In Progress

**Priority:** Medium — Phase 1b item #5 (user choice 5.A); closes Phase 1b
**Blocked by:** VS-44

**Scope:**

Money that comes back for a purchase used to be either edited into the
original (losing the month it arrived) or logged as income (inflating income).

- Migration 040 adds `expenses.refund_of`. A refund is an expense row with a
  **negative** amount in the purchase's category, dated the day the money came
  back and credited to an account. Every total that sums expenses — month
  spend, envelopes, reports, the typical month, account balances — nets it out
  in the month of the refund with no second ledger.
- `expenses.refunds`: record (capped at what is left to refund; only a purchase
  can be refunded), list, remove. Deleting a purchase deletes its refunds; a
  purchase cannot be edited below what was refunded; a refund row cannot be
  edited directly.
- Feed: a refund reads "Refund · Food +5 000" and opens its purchase. The
  expense detail gains a Refunds section and a "Record refund" sheet.
- The report donut leaves out a category that refunds turned negative.
- Supabase patch 044 (folded into 037 and `schema.sql`) must run before a build
  with migration 040 syncs.

**TDD Anchor:**

- Test: `recordRefund` — category, month and account effects; over-refund, refund-of-refund and bad input rejected.
- Test: removal undoes it; deleting a purchase takes its refunds; edit guards.
- Test: feed row and tap target; donut skips negative categories; refunds section states.

**Done when:** a returned pair of shoes shows as money back in the month it
came, in the right category and account, without touching income.

**Known limitation:** a refund of an imprévu is not itself flagged, so the
month's imprévus total is not reduced (the month's spending is).

---

### VS-46: Baseline and Provisional Guidance 🔄 In Progress

**Priority:** High — Phase 2 of the progression plan
**Blocked by:** VS-41 (complete months), VS-42…VS-45 (Phase 1b)

**Scope:**

Useful from day one on the user's own estimates, honest about how much real
history stands behind any figure. Lives in `budget` (planning data), so it
needs no new cross-feature edge: the checklist reads other slices' tables by SQL.

- Migration 041: synced, append-only `baseline_facts` (kind, value, source
  user | observed). The latest row per kind wins; earlier answers are kept.
- **Checklist card** on the dashboard ("Set up your baseline", N of 5): confirm
  balances, add regular bills, record debts (or "None"), check fixed categories
  (or "Looks right"), enter estimates. Each step opens the existing screen and
  ticks itself off from real data; hidden when done or dismissed.
- **Estimates screen** (`/budget/estimates`): typical monthly income, regular
  or irregular (pay day if regular), monthly essentials; each answer shows when
  it was set and whether typed or adopted from logged months.
- **Reports "Estimate vs actual"**: income estimate beside income received,
  essentials beside observed fixed spending, over complete months; offers to
  adopt the observed figure, never replaces it silently.
- **Provisional labels**: the typical-month card (Provisional / Reliable at 3
  complete months) and the planner's "Use my averages · provisional, N months".
- Supabase patch 045 (folded into 037 and `schema.sql`).

**TDD Anchor:**

- Test: facts — empty start, typed vs observed, history kept, unchanged answers not rewritten, validation.
- Test: checklist — each step from real data or an explicit answer.
- Test: `countCompleteMonths`; profile income average over complete months.
- Test: screens — checklist card, estimates form, comparison card (offers, never auto-replaces), labels.

**Done when:** a new or existing user can set up a baseline in five short
steps, plan from their estimates on day one, and see those estimates set beside
reality — labelled provisional — once real months are logged.

---

### VS-47: Budgeting with Real Cash Flow 🔄 In Progress

**Priority:** High — Phase 3 of the progression plan
**Blocked by:** VS-46 (income estimate), VS-42 (trustworthy wallet balances)

**Decisions (2026-10-17):** default budget = expected income (fallback: income
received); income above the budget prompts "give it a job", never raises the budget
by itself; the Budget tab shows budget left · cash · committed, no safe-to-spend yet.

**Scope:**

- **Expected vs received income.** With no explicit total, the month's budget is the
  typical-income estimate in force when the month ended; without one, income
  received. The hero says "Planned on expected income · X of Y received"; the
  planner says "Following your expected income". Dashboard and Reports keep
  reporting income received.
- **Plan before payday.** A month sized by an estimate counts as planned (no empty
  state) and the over-budget guard binds from day one.
- **Give it a job.** Income beyond the budget shows a card on the current month: add
  it to the budget (explicit total) or leave it unassigned. Migration 042 adds
  synced `allocations.surplus_seen` so a left surplus stays quiet until more arrives.
- **Money view.** Budget left · cash in wallets (`getCashOnHand`) · committed
  (recurring still to log, open planned items due, debts owed due — to month end),
  current month only, with a warning when more is due than the wallets hold.
- New edge `budget → accounts` (cash on hand). Planned and debts read by SQL.
- Supabase patch 046 (folded into 037 and `schema.sql`).

**TDD Anchor:**

- Test: expected income — none, latest before month end, closed months untouched, zero = none.
- Test: plan — expected before payday, fallback to received, surplus never raises the budget, explicit total, add/leave/ask again.
- Test: over-budget guard and "planned" state on expected income; dashboard income stays received.
- Test: committed — weekly/monthly occurrences, paused bills, planned by item/list date, bought/undated excluded, debts less repayments.
- Test: cash on hand; screens — hero line, surplus card, money view (current month only), planner copy.

**Done when:** a salaried user sees a budget on the 1st, an irregular earner's
budget no longer climbs with each payment, and the Budget tab tells plan, cash and
promised money apart.

---

### VS-48: Goals in Real Wallets 🔄 In Progress

**Priority:** High — Phase 4 of the progression plan (part 1 of 2; VS-49 links goals to the budget)
**Blocked by:** VS-42 (trustworthy wallet balances), VS-43 (transfers), VS-46 (essentials estimate)

**Decisions (2026-10-17):** a goal's money lives in a real wallet (progress = its
balance, saving = a transfer); first types are the starter buffer and sinking funds;
saving is pay-yourself-first (VS-49); safe-to-spend on the Budget tab only (VS-49).

**Scope:**

- New `goals` slice (`goals → accounts`). Migration 043: synced, soft-deleted `goals`
  (name, kind buffer | sinking, target, date for sinking, wallet, monthly amount).
- One live goal per wallet; hidden wallets refused.
- **Goals screen** (drawer → Goals): progress from the wallet, "Kept in …", sinking
  pace ("By {date} · needs X a month", overdue, not-enough warning), buffer pace
  ("about N months to go"), saved this month, Goal reached.
- **Save now** opens the transfer form pointed at the goal's wallet
  (`/transfers/log?to=<id>`, new `TransferLogRoute`).
- **Form:** kind, name, target (+ one month of essentials), date, wallet, monthly
  amount (+ the amount a sinking fund needs); edit and confirm-guarded delete.
- Supabase patch 047 (folded into 037 and `schema.sql`).

**TDD Anchor:**

- Test: pace — months left, required monthly, overdue, buffer months-to-target, reached, overdrawn.
- Test: service — validation, wallet already used or hidden, soft delete frees the wallet, progress from balance and this month's transfers.
- Test: screens — list lines, Save now route, form suggestions, edit/delete; transfer pre-fill; drawer row.

**Done when:** the user can start a buffer and a sinking fund in their own wallets
and see, from real balances, whether each is on track.

---

### VS-49: Pay Yourself First and Safe to Spend 🔄 In Progress

**Priority:** High — Phase 4 of the progression plan (part 2 of 2)
**Blocked by:** VS-48 (goals), VS-47 (money view)

**Scope:**

- **Pay yourself first.** Goals' monthly amounts (goals live during the month) are
  taken out of the month's total before the envelopes: `spendable = total − set aside`.
  The planner says "X goes to your goals first" and shares out only the rest; the
  hero says "After X set aside for your goals". Available, the month-wide guard,
  the Dashboard and Reports' planned figure all measure against spendable.
- **Safe to spend** in "Your money now": cash − goal-wallet cash − committed, with
  "X of it is in goal wallets" and a warning in words when negative. Budget tab only.
- A reached goal that still sets money aside says so on its card.
- `budget` reads `goals` by SQL (`budget.goals`), so there is no `budget → goals` edge.
  `suggestFromHistory` moves to `budget.suggestions.ts` (300-line ceiling).
- No migration.

**TDD Anchor:**

- Test: set aside — live window by created/deleted dates; goal cash excludes deleted goals and hidden wallets.
- Test: plan — spendable, unassigned, over-allocation, shortfall floor, guard when goals take everything, surplus vs total.
- Test: screens — planner line and remainder, hero line, money view safe-to-spend and warning, reached-goal hint.

**Done when:** saving for goals is the first line of every month's plan, and the
Budget tab says how much is truly free to spend.

---

### VS-50: Emergency Reserve 🔄 In Progress

**Priority:** High — after Phase 4, user decision 2026-10-18
**Blocked by:** VS-48 (goals), VS-41 (complete months, fixed/variable), VS-46 (essentials estimate)

**Decisions (2026-10-18):** next is the emergency reserve; the user picks months and
the app sizes it from essential spending (observed complete months, else the
estimate). Tontines come later as their own entity with rotation.

**Scope:**

- Third goal kind `reserve`: months of essentials (form 3–6, table 1–12), kept in its own
  wallet like every goal. Target = months × essentials, re-sized on read as real months
  are logged; provisional below 3 complete months.
- Essentials = `expenses.getObservedFixedAverage` (new `expenses.essentials.ts`) when
  positive, else the `monthly_essentials` estimate. The rule for what counts as fixed
  moves to `expenses.costType.spendKindOf`, shared with the Reports typical month.
- New edge `goals → expenses`.
- Form: months picker, live size and basis; with no essentials, a message and a link to
  Estimates (save disabled). Card: "N months of essentials at X a month · provisional".
- Migration 044 rebuilds `goals` (SQLite cannot widen a CHECK) in one transaction,
  keeping ids, uuids and sync state, and adds `target_months`. Supabase patch 048
  (folded into 037 and `schema.sql`).

**TDD Anchor:**

- Test: `spendKindOf`; observed fixed average over complete months only.
- Test: migration 044 keeps existing goals and sync state; reserve kind and months range; triggers.
- Test: essentials observed vs estimate vs unknown; reserve sizing, refusal without essentials, re-size on read and on edit.
- Test: form months/size/basis/missing state; card basis line.

**Done when:** the user can build a reserve of a chosen number of months whose size
follows their real essential spending.

---

### VS-51: Tontines 🔄 In Progress

**Priority:** High — user decision 2026-10-18 (part 1 of 2; VS-52 adds committed money and reminders)
**Blocked by:** VS-42 (wallet balances), VS-44 (the money-moving pattern of debts)

**Decisions (2026-10-18):** own entity with rotation; money is neither spending nor
income; contributions are scheduled and ticked when paid; the payout turn is optional
until the draw.

**Scope:**

- New `tontines` slice (`tontines → accounts`). Migration 045: synced, soft-deleted
  `tontines` and `tontine_payments`.
- Schedule derived from start date + weekly/monthly cycle, one cycle per member; status
  paid / overdue / due / upcoming. Monthly cycles keep their day without drifting.
- Tick a contribution paid (wallet + date, payment sheet) or undo it; record the payout
  once the turn is set (amount starts at the full pot) or undo it.
- Wallet balances count contributions out and the payout in (`accounts.balance`).
- List and detail: contribution and cycle, turn and pot, contributions paid, overdue,
  position (ahead / behind / level), finished. Form with edit and confirm-guarded
  delete. Drawer → Tontines.
- Supabase patch 049 (folded into 037 and `schema.sql`).

**TDD Anchor:**

- Test: cycle dates (weekly, clamped monthly), statuses, payout turn, summary (ahead, behind, finished).
- Test: service — validation, pay once per cycle, payout once and only with a turn, undo, members vs paid cycles, soft delete.
- Test: wallet balances with contributions, payout, removed and deleted, after a balance check.
- Test: screens — list lines, detail ticking / undo / payout, form create / edit / delete; drawer row.

**Done when:** the user can follow a tontine cycle by cycle, from real wallets, and see
where they stand before and after their turn.

---

### VS-52: Tontine Reminders and Committed Contributions 🔄 In Progress

**Priority:** High — tontines part 2 of 2
**Blocked by:** VS-51 (tontines), VS-47/49 (committed money, safe to spend), VS-39 (attention pattern)

**Scope:**

- `tontines.getDueContributions(through?)`: unpaid contributions of live tontines due by
  a date, overdue included.
- **Committed money** gains a `tontines` line (unpaid contributions due by month end), so
  safe to spend accounts for them. New edge `budget → tontines` (that one read). The
  breakdown names only the sources with something due.
- **Reminders** (`tontineDue` notifications, 09:00): per tontine, one grouped nudge for
  overdue contributions, and a 3-day heads-up plus an on-the-day reminder for the next
  contribution. Re-planned on open, after any tontine or payment write, and on foreground.
- **Drawer dot** on Tontines via `AttentionProvider` (`ATTENTION_TONTINES`), published by
  a root `TontineReminderScheduler`.
- No migration.

**TDD Anchor:**

- Test: due contributions — unpaid only, overdue included, by date, deleted tontines out.
- Test: reminder planning (heads-up, on the day, grouped overdue, next cycle only, per tontine), counts, reconcile cancels only tontine reminders.
- Test: scheduler publishes and re-plans on change; trigger copy; committed tontines line and total; breakdown; drawer dot.

**Done when:** a due or missed contribution reaches the user without opening the
tontine, and the Budget tab's committed money and safe to spend include it.

---

### VS-53: Net Worth and Savings Rate 🔄 In Progress

**Priority:** High — user decision 2026-10-21
**Blocked by:** VS-42 (balance checks), VS-44 (debt repayments), VS-51 (tontines)

**Decisions (2026-10-21):** money only (assets later); month-end snapshots with a
deliberate recalculate; savings rate = income kept.

**Scope:**

- `accounts.getAccountBalance(id, asOf?)`: a wallet's balance at the end of a day
  (balance checks dated by then honoured).
- New `networth` slice (`networth → accounts`; `reports → networth`): net worth as of a
  day (wallets + lent − owed + tontine position), the month's income and spending, the
  savings rate.
- Migration 046: synced, append-only `month_snapshots`. A root `MonthCloser` stores
  every closed month without one (first entry onward, at most 24 months back), waiting
  while a recurring bill is still to be logged into a month.
- Reports card: today's net worth and its parts, change since the last closed month,
  this month's savings rate so far and last month's; History (`/reports/net-worth`)
  lists closed months with their change and savings rate, each recalculable.
- Supabase patch 050 (folded into 037 and `schema.sql`).

**TDD Anchor:**

- Test: balances as of a day, with and without later balance checks.
- Test: net worth parts as of a day (lent/owed less repayments by then, tontines, deleted debts, hidden wallets); flows; savings rate.
- Test: closeMonths fills closed months only, keeps them on later edits, recalculate appends, 24-month cap, waits for unlogged recurring bills.
- Test: card, history screen, month closer.

**Done when:** the user sees what they are worth today and month by month, and how
much of each month's income they kept — figures that stay put once a month closes.

---

### VS-54: Debt Terms and Instalments 🔄 In Progress

**Priority:** High — user decision 2026-10-21 (part 1 of 2; VS-55 adds instalment reminders)
**Blocked by:** VS-44 (repayments), VS-47 (committed money), VS-53 (net worth)

**Decisions (2026-10-21):** cost entered as a total to repay (no rate formulas); optional
equal instalments ticked paid; committed money counts instalments due, not the whole
balance; both directions.

**Scope:**

- Migration 047: debts gain total_to_repay and an instalment schedule (count, weekly /
  monthly, first date); debt_payments gain instalment. Supabase patch 051.
- Repayable = total to repay, else amount, everywhere outstanding is read: the ledger,
  Reports totals, settle and reopen, net worth, committed money.
- Cost and an equivalent monthly rate on the detail ("costs" / "earns" for a loan given).
- Equal instalments (shared `utils/cycleDate` and `utils/instalments`); Mark paid records
  exactly that instalment through the repayment sheet (wallet + day), Undo removes it.
- Committed money: a scheduled debt counts only its unpaid instalments due by month end.
- Form: optional total to repay with a live cost preview, optional instalments with a
  "6 × 20 000 FCFA" preview.

**TDD Anchor:**

- Test: instalment split, schedule statuses, cost and rate.
- Test: service — validation, repayable in outstanding and totals, pay once per instalment, settle and reopen at the total, free repayments up to the total.
- Test: committed money for scheduled and unscheduled debts; net worth with a total to repay.
- Test: form (total, preview, instalments) and detail (summary, schedule, pay, undo, lent wording).

**Done when:** a loan with interest shows what it really costs, and an instalment plan
is followed instalment by instalment, with only what is due counted as committed.

---

### VS-55: Instalment Reminders 🔄 In Progress

**Priority:** High — debt terms part 2 of 2
**Blocked by:** VS-54 (instalments)

**Scope:**

- Pure `debt.reminders.dueReminders`: a debt without instalments keeps its due-date
  reminder; a scheduled debt gets one grouped reminder for its overdue instalments and
  one for its next instalment within three days — its due date is ignored.
- `getDueReminders` composes it per pending debt; `DebtReminderScheduler` delivers as
  before (on app open, cancel-then-schedule).
- Notification copy names the instalment (en/fr).
- No migration.

**TDD Anchor:**

- Test: next instalment within three days, quiet further out, overdue grouped plus next, unscheduled debts unchanged; alert copy.

**Done when:** a missed or upcoming instalment reaches the user without opening the debt.

---

### VS-56: Category Detail — Where the Money Went 🔄 In Progress

**Priority:** High — user request 2026-10-22
**Blocked by:** VS-33 (envelopes), VS-41 (cost types), VS-45 (refunds)

**Decisions (2026-10-22):** tapping an envelope opens the detail, and editing moves
inside it ("Edit budget"); Budget tab only for now. Reports can open the same route
by path later, with no new import.

**Scope:**

- `budget.categoryDetail` (budget → expenses, already approved): one category's month
  split by subcategory (share, count, usual month each), up to three repeated notes
  ("Taxi ×18"), fixed / variable / unexpected (`spendKindOf`), and the usual month over
  complete months (the planner's window).
- `budget.nextMonth` (pure): a suggested budget for next month (back to usual when
  more than 5% above it, else trim the non-fixed part by 10%), never below fixed bills,
  with up to three steps and their savings.
- `CategoryDetailScreen` at `/budget/category/[id]?month=`, four cards: envelope with a
  % chip vs usual and "Edit budget"; where it went (per-part % vs usual, repeats); next
  month (running month only; one tap sets the envelope); transactions.
- Budget tab: an envelope tap opens the detail. Reports: a category row opens it (by path).
- Duplicates removed (user audit request): Budget insights' "Biggest share" and
  "Versus last month"; Reports' "Suggestions" (restated the comparison).
- No migration.

**TDD Anchor:**

- Test: split, shares and per-part usual month; repeats by note (refunds skipped); kinds; usual over complete months only.
- Test: next-month plan: back to usual, on pace, fixed floor, trim, no usual, all fixed, skip one in four.
- Test: screen: % chips, closed vs running month, next-month card and setting it, empty month, edit and cover, French.
- Test: Budget tab and Reports rows open the detail for the shown month.

**Done when:** from any envelope the user can see where that category's money went
and which purchases to cut.

---

### VS-57: Quiet Daily Reminder 🔄 In Progress

**Priority:** High — user request 2026-10-22
**Blocked by:** VS-08 (daily reminder)

**Decision (2026-10-22):** the reminder is not needed on a day the user has already
logged an entry.

**Scope:**

- `services/transactions.getLoggedDays(from, to)`: days with an expense, income, live
  transfer or confirmed no-spend day.
- `notifications/triggers/dailyReminder.buildDailyReminders`: one dated reminder a day
  for 14 days at the chosen time, skipping past times and logged days (replaces the
  repeating daily trigger).
- `auth.applyReminderSchedule` plans them; `DailyReminderScheduler` re-plans on open,
  on background and on return. Settings copy says it only reminds on unlogged days.
- No migration.

**TDD Anchor:**

- Test: logged days across the four sources, range and removed transfers.
- Test: reminders start today, skip a logged today or later day, start tomorrow once the time has passed, reject bad times.
- Test: scheduling cancels old reminders, skips today when logged; the scheduler re-plans on background and active.

**Done when:** a user who has logged today gets no reminder tonight, and still gets one
on a day they forget.

---

### VS-58: Starting Point — Your First Three Months 🔄 In Progress

**Priority:** High — user request 2026-10-22
**Blocked by:** VS-41 (typical month), VS-56 (shared % chip)

**Decisions (2026-10-22):** the first three *complete* months; while they are being
recorded only a progress line appears and nothing else changes; merged into "Your
typical month" as Starting point · Now columns rather than a second card.

**Scope:**

- `reports.startingPoint`: first logged day → closed months → the first three complete
  ones; their profile through `buildSpendingProfile`. Nothing stored, no migration.
- `TypicalMonthCard` + `StartingPointCompare`: progress line; "same months" note; table
  of total / fixed / variable / unexpected with a % chip, categories on tap.
- Shared `utils/percentChange` and `components/ChangeChip`, now used by the category
  detail too (one chip, not two).

**TDD Anchor:**

- Test: picks the first three complete months; nothing before the first entry; the running month never counts; a half-logged first month is skipped and the point stays fixed.
- Test: card progress, comparison rows and %, categories on tap, same-months note; Reports loads it.
- Test: shared chip signs and "New"; percentChange.

**Done when:** the user can see what they really spent in their first three months and
how far their spending has moved since.

---

### VS-59: Subcategory Detail 🔄 In Progress

**Priority:** High — user request 2026-10-22
**Blocked by:** VS-56 (category detail), VS-58 (starting point)

**Scope:**

- `getCategoryDetail(month, category, sub?)`: narrows to one subcategory (or `'none'`):
  its spend, repeats and its own usual month; no split.
- Category detail: each "Where it went" line opens `/budget/category/[id]?month=&sub=`;
  the narrowed screen shows spend with a % chip, repeats and transactions, and no
  envelope, editing or next-month plan (budgets are per category).
- `buildSpendingProfile`: each category carries its subcategory averages; "Compare by
  category" in the starting point lists them under their category, start vs now.
- Fix: a category in both the fixed and variable lists is added up in the comparison.
- No migration.

**TDD Anchor:**

- Test: narrowed detail (spend, repeats, usual, no split; 'none'; unnarrowed).
- Test: part lines open the subcategory; narrowed screen title, pace %, filtered transactions, no envelope or plan.
- Test: profile subcategory averages; comparison sub rows; partly-fixed category added up.

**Done when:** from any category the user can open each subcategory, and the
starting-point comparison shows subcategories too.

---

### VS-60: Weekday Recurring Expenses 🔄 In Progress

**Priority:** High — user request 2026-10-22 ("why" behind spending, part 1 of 2)
**Blocked by:** VS-07 (recurring expenses)

**Decision (2026-10-22):** routine spending (transport to work) is set once as a
recurring expense that repeats Monday to Friday, so it is logged as fixed and the
rest of the category is what the user chooses. Part 2 is events (VS-61).

**Scope:**

- `Frequency` gains `weekdays`; `utils/weekdays` (`nextWeekday`, `firstWeekdayOnOrAfter`).
- `advanceDueDate` skips weekends; create and update roll a weekend start to Monday.
- Migration 048 rebuilds `recurring_expenses` for the new CHECK value (rows, cloud keys,
  wallet and sync state kept; index and triggers recreated). No Supabase patch.
- Recurring form: a third option, "Weekdays" / "Jours ouvrés"; list badge.
- Committed money counts each working day left in the month (no change needed).

**TDD Anchor:**

- Test: migration keeps rows and sync state, accepts weekdays, rejects unknown, re-arms sync.
- Test: weekday dates; advance, weekend start on create/update, auto-log skips weekends.
- Test: committed money per working day; form saves weekdays, list label.

**Done when:** a weekday routine is entered once and logged each working day.

---

### VS-61: Events — Why the Money Went 🔄 In Progress

**Priority:** High — user request 2026-10-22 ("why" behind spending, part 2 of 2)
**Blocked by:** VS-45 (refunds), VS-60

**Decisions (2026-10-22):** one event per expense; an event is a name and an optional
date, total only (no event budget yet); separate from planned lists.

**Scope:**

- Migration 049: synced `events` table (soft-delete) and `expenses.event_id`; `events`
  before `expenses` in `SYNCED_TABLES`; sync FK map. Supabase patch 052 (folded into
  037 and `schema.sql`).
- New `events` slice: list with totals, event page (total, by category, its expenses),
  create / edit / delete (frees its expenses). Drawer → Events.
- Expenses: `eventId` on create/update; `EventPicker` on the log and detail screens,
  with "New event" on the spot (approved `expenses → events`). Refunds take their
  purchase's event and follow it.

**TDD Anchor:**

- Test: migration (event stamped for sync, expense link, trigger watches event_id, sync order).
- Test: events service (create/validate, totals net of refunds, page, update, delete frees expenses).
- Test: expense event saved/moved/cleared; refunds follow; hooks; list, page and picker screens.

**Done when:** the user can tag spending with an occasion and see what it really cost.

---

### VS-62: Why the Money Went 🔄 In Progress

**Priority:** High — user request 2026-10-22 ("why" behind spending, closes VS-60/61)
**Blocked by:** VS-60 (weekdays), VS-61 (events)

**Scope:**

- `expenses.reason`: `reasonOf` (event → unexpected → routine → everyday), `sumByReason`,
  `groupByEvent`; shared types in `types/reasons`; `services/transactions.getEventNames`.
- Shared `components/WhyBreakdown`: one bar, a row per reason with amount and share,
  events listed under "Events" and tappable. Draws its own card; nothing without spending.
- Budget category detail (and a narrowed subcategory) and Reports' month both show it.
- No migration.

**TDD Anchor:**

- Test: reason rule and precedence; sums with refunds netted; grouping by event.
- Test: component rows, shares, events and empty; category detail and Reports reasons; screens open events.

**Done when:** for any category or month the user sees how much was routine, events,
surprises and everyday habits.

---

### VS-63: My Path — Step-by-Step Journey 🔄 In Progress

**Priority:** High — user request 2026-10-22 ("the app must feel like a step-by-step process")
**Blocked by:** VS-58 (starting point), VS-46 (baseline facts)

**User decisions (2026-10-22):** locked steps are previews, never hidden; skipping ahead
is allowed with a warning; Optimize gives suggestions only, on variable spending; the
path lives in a dashboard card and a new tab.

**Scope:**

- New `journey` slice: `resolveJourney` (pure) and `getJourney`. Observe = the starting
  point's 3 complete months; See = "I've seen it"; Plan = a complete month after the start
  with an envelope or explicit total; Optimize = a complete month, from the planned one on,
  under the start's variable average; Grow = ongoing. Steps pass in order.
- Answers as new `baseline_facts` kinds (`picture_reviewed`, `journey_skipped`,
  `journey_reached`) with `budget.baseline.getBaselineFactValue`. No migration, no Supabase patch.
- "My path" tab (5th tab): every step with its status, the current (or skipped) step's
  progress and action, locked previews, skip to the next step after a warning.
- Dashboard path card replaces the setup checklist card; the checklist moves onto the path.
- Edges: `journey → budget`, `journey → reports`, `dashboard → journey`.

**TDD Anchor:**

- Test: pass rules and order; plans in the starting months, the running month or an
  incomplete month do not count; a cheaper month before the first plan does not count;
  skip forward only; a reached step survives corrected data.
- Test: hook loads, errors, reviews and skips; screen statuses, progress, preview, skip
  warning, See summary, planner link, Optimize comparison, goals link, French; card.

**Done when:** the user opens "My path" and sees where they are, what moves them on and
what comes next; the dashboard shows the same in one card.

---

### VS-64: Locked Previews Across the App ➡️ Folded into VS-75 (UX-03 + UX-10)

**Blocked by:** VS-63

- The current step published through a shared provider in `components/` (like
  `AttentionProvider`), so gated screens never import `journey`.
- Budget planning and envelopes are previews before Plan; goals, emergency reserve and
  pay yourself first are previews before Grow. Each says what unlocks it, with "Show anyway".
- Logging, wallets, debts, tontines and transfers are never gated.

---

### VS-65: Suggestions to Cut Variable Spending ➡️ Folded into VS-81 (UX-25)

**Blocked by:** VS-63

- On the Optimize step: the biggest variable categories against the starting point, with
  what a modest cut frees each month; each opens the category detail. Suggestions only.

---

## UX REDESIGN (pre-release, plan in docs/ux-redesign/)

### VS-66: One Name per Figure (UX-01) 🔄 In Progress

**Priority:** P0 — release cut (docs/ux-redesign/06 §12.1); decisions D1–D10 approved 2026-10-24
**Blocked by:** —

**Scope:**

- One visible label per figure, the same on every screen, in en and fr: *Left in your plan* /
  *Reste au budget* (budget remaining), *Free cash* / *Argent libre* (safe to spend), *A day to
  stay on plan* (safe daily spend), *Due before month end* (committed), *to share out*
  (unassigned), *Keep it aside* (unbudgeted income), *Heading for* (projected spend).
- The money view no longer repeats the plan figure as *Budget left*.
- Reports: *Planned* → *Budget*, *Expense Performance* → *The month against your plan*.
- Sentence case for every English title; Dashboard pace chip matches the Budget health chip.
- Copy and key renames only: no calculation changes. The Dashboard's *Net* and daily pace
  caption are left for UX-04 and UX-11.

**TDD Anchor:**

- Test: money view shows cash and what is due, never *Budget left*; names *Free cash*.
- Test: hero, envelope and Reports labels in en and fr; Dashboard pace words equal Budget's.

**Done when:** no two different figures share a key word, and no figure has two labels.

---
### VS-67: Readable Green Text (UX-02) 🔄 In Progress

**Priority:** P0 — release cut (docs/ux-redesign/06 §12.1)
**Blocked by:** —

**Scope:**

- New token `PRIMARY_TEXT` (light `#047857`, dark `#34d399`) for green text and small glyphs:
  links, ghost/secondary button labels, selected rows, the income tile, icons beside green text.
  `PRIMARY_GREEN` stays for fills, bars, charts and the active tab.
- Shared `utils/contrastRatio` (WCAG 2 formula) so palettes are checked by tests.
- Not in scope, decision pending: white labels on `PRIMARY_GREEN` fills (primary buttons, FAB,
  selected pills and segments) are also ~2.5:1.

**TDD Anchor:**

- Test: contrast ratio math (1, 21, order-free, rejects translucent colours).
- Test: `PRIMARY_TEXT` ≥ 4.5:1 on every light and dark surface; secondary/ghost buttons use it.

**Done when:** every green text in the light theme reaches WCAG AA.

---
### VS-68: Drawer Grouped by Purpose, Wallets Everywhere (UX-18) 🔄 In Progress

**Priority:** P0 — release cut (docs/ux-redesign/06 §12.1, decision D7)
**Blocked by:** —

**Scope:**

- Drawer in two groups: *My money* (Wallets, Goals, Debts, Tontines, Planned purchases, Events)
  and *App* (Categories, Preferences, Backup & restore, Export & import, Feedback).
- The disabled "Soon" rows (Delete & Reset, Help) and their mechanism are gone.
- The money sense of *account* reads *wallet* / *portefeuille* in every string (accounts, expenses,
  income, debts, export, baseline), as goals and tontines already did. *Cloud account* is unchanged.
  Routes, code names and the `accounts` table keep their names.

**TDD Anchor:**

- Test: drawer order and group titles in en and fr; no placeholder rows; Wallets opens `/accounts`.
- Test: wallet wording on Accounts, transfers, the baseline step and the debt form.

**Done when:** every drawer row opens a screen, and one word names a wallet everywhere.

---
### VS-69: Green Fills That Carry White Labels (UX-02b) 🔄 In Progress

**Priority:** P0 — release cut; approved 2026-10-24
**Blocked by:** VS-67 (PRIMARY_TEXT)

**Scope:**

- New token `PRIMARY_FILL` (`#047857`, both themes) for solid green behind white content: the
  primary button, the filled icon button, the add FAB, active segments, category chips, recurring
  and income-source pills, a ticked planned-item checkbox. White on it is ~5.5:1 (was ~2.5:1).
- Fills with nothing on them keep `PRIMARY_GREEN`: bars, charts, PIN and onboarding dots, journey
  segments, the toggle track, the active tab.

**TDD Anchor:**

- Test: white on `PRIMARY_FILL` ≥ 4.5:1 in light and dark; the primary button uses it.

**Done when:** every white label on a green fill reaches WCAG AA.

---
### VS-70: Home Leads with the Plan, or with What Was Spent (UX-04) 🔄 In Progress

**Priority:** P0 — release cut (docs/ux-redesign/06 §12.1, decision D2a)
**Blocked by:** —

**Scope:**

- Whether a month has a plan follows the Budget tab's rule (`isUnplanned`): an explicit total,
  an expected-income estimate or envelopes. Income received alone is not a plan — before this,
  Home showed *Left in your plan* = income − spending while the Budget tab said "No plan yet".
- No plan: the hero is *Spent this month*, with "18 of 23 days logged" (the same logged-day rule
  as complete months), money in on its own line and a quiet *Plan a budget →* link. No bar, no
  pace chip, and no daily pace on the Today card.
- With a plan: unchanged, except the In / Out row loses *Net* (it stays in Reports).

**TDD Anchor:**

- Test: `isPlanned` for income only, explicit total, expected income; logged days and days so far.
- Test: card in both states, en and fr; no *Net*; the plan link opens the planner.

**Done when:** Home and the Budget tab always agree on whether there is a plan.

---
### VS-71: Observe Gives Feedback Before a Month Completes (UX-05/06/07) 🔄 In Progress

**Priority:** P0 — release cut (docs/ux-redesign/06 §12.1, decisions D4a, D5a, D-arch-2)
**Blocked by:** —

**Scope:**

- The Observe step and the Home path card show the running month: days logged so far, and whether
  it can still reach 80% (counting today, the days ahead and the missed days that can still be marked).
- Missed days: the last 7 days before today with nothing logged, never before the first day the user
  logged anything, each with *No spending*. Spending is added from Transactions.
- `confirmZeroDay` now refuses a day that already has spending (it was unchecked; past days make it reachable).
- A first month that began too late to count says so, with its start day and the first full month;
  a later month that can no longer count says so too. Copy only: the 80% rule is unchanged (D4a).
- New approved edge `journey → expenses` (`expenses.coverage`, `confirmZeroDay`); `isoDaysBefore`
  moved to `utils/formatDate`.

**TDD Anchor:**

- Test: `missedDays`, `monthLoggingStatus`, `getFirstLoggedDate`, the no-spend guard.
- Test: `getObserveLogging` and `markNoSpendDay` (window, first-day limit); hook refusal stays on screen;
  screen and card copy in en and fr.

**Done when:** a user observing sees progress every day, and can repair a forgotten day honestly.

---
### VS-72: First-Run Set-Up and a Checklist by Step (UX-08/09) 🔄 In Progress

**Priority:** P0 — release cut (docs/ux-redesign/06 §12.1, decisions D10, D-arch-1)
**Blocked by:** —

**Scope:**

- The four-card tutorial becomes a three-step set-up: what the app does (with the path's five
  steps), what each wallet holds today, and when to be reminded. Wallets and reminder can wait
  ("Not now", "No reminders"); "Skip set-up" leaves from any step.
- Wallets: `accounts/OpeningBalancesStep` records a dated balance check per wallet filled in
  (blank wallets untouched), which also ticks "Confirm your wallet balances".
- Reminder: `useAppSettings().enableReminder(time)` saves the time, asks for notification
  permission and turns reminders on only when granted. Default 21:00.
- The onboarding gate renders before the navigator exists, so "open Accounts by path" was not
  possible; the routing layer injects both steps into the gate, and onboarding still imports no
  feature (D-arch-1 resolved without a new edge).
- My path's checklist asks only for what the step needs: Observe → balances; See → + fixed
  categories; Plan onward → everything (`BASELINE_BY_STEP`).

**TDD Anchor:**

- Test: set-up flow (steps, later, skip, default time, a failed reminder still finishes), en and fr.
- Test: opening balances (only filled wallets, whole FCFA, nothing filled), `enableReminder` granted/refused.
- Test: `BaselineCard only`, and My path passing it by step.

**Done when:** a new user starts with true wallet balances and a reminder, and is asked about
bills and estimates only when planning.

---
### VS-73: One Daily Figure on Home and Budget (UX-11) 🔄 In Progress

**Priority:** P1 — release cut (docs/ux-redesign/06 §12.1, decision D3)
**Blocked by:** —

**Scope:**

- Home's Today card showed *Within/Over your daily pace of X*, where X was the budget ÷ every day
  of the month. The Budget tab showed a different amount a day: what is left ÷ the days left.
- Home now shows the Budget tab's `safeDailySpend` (from `getBudgetOverview`, which Home already
  reads), rounded the same way, as *A day to stay on plan: X* / *Par jour pour tenir le budget : X*.
- The within/over verdict is gone: the figure already counts today's spending, so comparing today
  against it would count it twice. Once the plan is used up the figure is 0, as on the Budget tab.
- No plan: no figure (unchanged from VS-70). `dailyBudgetPace` and the `overPace`/`withinPace` copy
  are removed; `DashboardState.dailyPace` is now `safeDailySpend`.

**TDD Anchor:**

- Test: the snapshot's figure equals `getBudgetOverview(...).safeDailySpend` for the same data; null
  without a plan.
- Test: Today card label, rounding, 0 when used up, hidden without a plan, en and fr.

**Done when:** Home and the Budget tab show the same amount a day for the same month.

---
### VS-74: One Loading, Empty and Error Pattern on Every Tab (UX-16) 🔄 In Progress

**Priority:** P1 — release cut (docs/ux-redesign/06 §12.1, finding F-23)
**Blocked by:** —

**Scope:**

- New shared `components/ErrorState`: what failed, "Nothing you logged is lost", the underlying
  message small, and *Try again*. A full block in place of a screen's content, or a compact card
  for one section or above figures still on screen.
- Loading is a skeleton shaped like the screen: Home (`DashboardSkeleton`, first load only, so a
  focus refresh no longer blanks Home), Transactions (row skeletons), My path and its Home card
  (`JourneySkeleton`), Reports (`ReportSkeleton`) and the Net worth card. Budget already had one.
- Errors use `ErrorState` everywhere. Before: a red row on Home, plain text on Budget, Reports and
  My path with no retry, and nothing at all from the Net worth and path cards.
- Empty with one action: a Transactions month offers *Add a transaction* (the FAB's sheet); a Reports
  month with nothing logged says so and leads to Transactions instead of a page of zeros.
- `useMonthlyReport` gains `refresh()`; the Reports tab now also re-reads the month on focus.
- Home hides the Today card when the month could not load, rather than showing 0.

**TDD Anchor:**

- Test: `ErrorState` full and compact, retry, detail, French.
- Test: per tab, the skeleton on a first load, the error with a working *Try again*, and the empty
  action (Transactions, Reports); the path and Net worth cards' placeholder and error.

**Done when:** every tab and card shows the same skeleton, empty-with-action and error-with-retry.

---
### VS-75: The Step Sets Emphasis Across the App (UX-03 + UX-10, VS-64) 🔄 In Progress

**Priority:** P1 — release cut, "if time allows" (docs/ux-redesign/06 §12.1, finding F-02)
**Blocked by:** —

**Scope:**

- UX-03: `components/JourneyStageProvider`, modelled on `AttentionProvider`, holds the current step.
  `useJourney` publishes it on every read (Home's path card reads it at launch); screens read it
  with `useJourneyStage` / `useIsBeforeStep` and never import `journey`. The step key and order
  moved to `types/journey` and `constants/journey` (the slice re-exports them). Unknown step → no
  preview, so nothing flashes.
- UX-10 previews, only where there is nothing to hide:
  - Budget tab, Observe or See, month without a plan: why planning comes after the first months,
    with *Plan anyway* (the planner) and *See my path*. From Plan on, the usual empty month.
  - Goals screen before Grow, no goals yet: goals come last, with *Add a goal anyway* and *See my
    path*. Covers the emergency reserve and pay-yourself-first, which are goals.
- A plan or a goal that exists always shows; every "anyway" opens the real tool, so nothing
  reachable before is unreachable after. Logging, wallets, debts, tontines and transfers are never staged.

**TDD Anchor:**

- Test: provider (unknown, publish, before-step, outside a provider); `useJourney` publishes.
- Test: Budget and Goals previews by step, the "anyway" and path actions, existing data never
  hidden, en and fr.

**Done when:** a user observing is told why planning and goals come later, and can still use both.

---
### VS-76: A Budget Tab That Reads in Five Figures (UX-13) 🔄 In Progress

**Priority:** P1 — release cut, "if time allows" (docs/ux-redesign/06 §12.1, findings F-04, F-07;
money-view layout change approved)
**Blocked by:** —

**Scope:**

- Hero: what is left, the status chip, the paced bar, "X of Y spent" and *A day to stay on plan: X*
  (Home's words, UX-11). *Heading for ≈ X by month end* only when the projection passes the plan.
  The days-left / per-day / heading-for stat row and the percentage are gone.
- *How this plan is built* opens a sheet with the sum: monthly total (and where it comes from),
  − set aside for goals, ± carried over, = to spend this month. The expected-income line stays in the
  hero only while less has come in than expected; it is always in the sheet.
- One action strip at a time: the surplus prompt first, then *… to share out*.
- *Free cash* is one line; it opens the subtraction: cash in wallets − in goal wallets − due before
  month end (with its parts) = free cash. A shortfall is still stated on the line.
- Envelope rows are two lines (name and what is left, then the paced bar). The run-rate line only
  when at risk or over; rollover is an icon with an accessible label. The category detail keeps the
  full row (`detailed`).
- `BudgetBreakdownSheet` shows both sums. Presentation only: no calculation changed.

**TDD Anchor:**

- Test: hero figures, heading-for only past the plan, expected-income rule, plan sheet sums, fr.
- Test: free-cash line and its subtraction, shortfall on the line, fr.
- Test: envelope row compact vs at risk / over vs detailed, rollover label; one strip at a time.

**Done when:** six figures or fewer stand before the category list, and each sum is one tap away.

---
### VS-77: Reports in Three Groups, Stepper First (UX-14) 🔄 In Progress

**Priority:** P1 — release cut, "if time allows" (docs/ux-redesign/06 §12.1, findings F-05, F-06, F-07)
**Blocked by:** —

**Scope:**

- The month stepper comes first and scopes *This month*: in and out, a one-sentence conclusion
  ("Food and Transport were 58% of your spending.", `reports.summary.topCategoriesShare`), the
  month against its plan, *Why you spent*, the categories and the biggest changes since last month.
- The Unexpected card is merged into *Why you spent* as its footer (`WhyBreakdown footer`,
  `UnplannedSummary`). Its count covers every expense marked unexpected, including one tagged with
  an event that the bar counts under Events.
- The donut is replaced by a ranked bar on each category row (length, not angle); each row still
  opens the category detail by path.
- The comparison lists the three biggest changes in FCFA, either way, with *Show all (N)*.
- *Over time* (typical month, estimates) and *Wealth* (net worth, debts as of today) fold. Default:
  *Over time* open from See, *Wealth* open at Grow, both open while the step is unknown. The user's
  choice is remembered on the phone: `hooks/useRememberedToggle` over `services/uiPreferences`,
  backed by migration **050** `ui_preferences` (key/value, local only, never synced, no Supabase patch).

**TDD Anchor:**

- Test: migration and preference service on in-memory SQLite; the toggle hook (default follows the
  step until chosen, choice remembered, a failed save keeps the choice).
- Test: `topCategoriesShare`; comparison top 3 and *Show all*; the Why footer.
- Test: Reports order, summary sentence, bars, group defaults by step, toggling, debts in Wealth, fr.

**Done when:** every figure above the first group heading changes with the month, and each group
answers one question.

---
### VS-78: Colours Mean One Thing Each (UX-15) 🔄 In Progress

**Priority:** P1 — release cut, "if time allows" (docs/ux-redesign/06 §12.1, findings F-08, F-10)
**Blocked by:** —

**Scope:**

- Status colours (success / warning / danger) are kept for status: on track, watch out, over,
  good or bad changes, errors.
- New `KIND_*` tokens, in both palettes, for kinds of spending: routine/fixed slate, events violet,
  unexpected brown (with `_LIGHT` and a 4.5:1 `_TEXT`), everyday/variable blue. Used by *Why you
  spent*, the typical-month bar, the imprévus count, the *Unexpected* badge, chip and toggle, and
  Home's imprévus dot. "Everyday — the habits you can change" no longer reads as good.
- Category colours come from the category id (`colorForCategory`), so a category keeps its colour
  every month; the palette has no green, amber or red.
- The Expense and Income log tiles share one neutral surface with a hairline border. *Revised after
  the first device test (2026-10-26):* the Expense icon and text are red (`DANGER_TEXT`), Income
  stays green, so the direction reads at a glance.
- The over-plan hero figures on Home and Budget stay in plain text; the label and the chip carry
  the status.
- Reports' plan bar fills the spent part in the status colour on a neutral track (it was black on green).

**TDD Anchor:**

- Test: kind tokens distinct from every status colour, 3:1 fills and 4.5:1 unexpected text, both themes.
- Test: `colorForCategory` stable by id, palette free of status hues.
- Test: Why dots use the kind tokens; neutral log tiles; hero figures not red.

**Done when:** no status colour stands for a kind of spending, and a category keeps its colour
across months.

---
### VS-79: Free Cash Says How Fresh the Balances Are (UX-21) 🔄 In Progress

**Priority:** P1 — release cut, "if time allows" (docs/ux-redesign/06 §12.1, R10, finding F-11)
**Blocked by:** —

**Scope:**

- `accounts.checks.getBalanceFreshness(today)`: the oldest of the active wallets' latest live
  checks (free cash is only as fresh as the wallet confirmed longest ago), the days since, how many
  wallets were never confirmed, and `stale` — a wallet never confirmed or a check over 30 days old
  (`FRESH_DAYS`). Hidden wallets are left out.
- The Budget money view reads it and `getUnassignedSpending` through the approved
  `budget → accounts` edge (`MoneyView.freshness`, `.unassigned`).
- Under *Free cash*: "Balances checked 3 days ago" / "today"; when stale, "Balances not confirmed
  since 20 Sep" or "Some wallet balances were never confirmed"; when expenses sit in no wallet,
  "2 expenses aren't in any wallet, so free cash may be off." Either case offers *Check balances*,
  which opens Accounts by path.
- No migration: the checks exist since VS-42. Home's Wallets card (the rest of F-11) is not changed.

**TDD Anchor:**

- Test: freshness on in-memory SQLite (never confirmed, oldest latest check, over 30 days, removed
  checks, hidden wallets, no wallets).
- Test: the free-cash line in each state, the link, fr; *Check balances* opens Accounts.

**Done when:** with a wallet unchecked for over 30 days, free cash says so and offers the check.

---
### VS-80: Each Screen Leads With What the Step Needs (UX-24) 🔄 In Progress

**Priority:** P2 — after the release cut (docs/ux-redesign/04 §7.3, decision D2 option b)
**Blocked by:** —

**Scope:**

- `JourneyStageProvider` also holds `JourneyFigures` (`types/journey`): the starting point's typical
  month and variable spending, the latest complete month's variable spending, and this month's
  logging. `useJourney` publishes them (`journey.figures.journeyFigures`); readers never import `journey`.
- Home hero (`dashboard.heroLead`): Observe and See lead with *Spent this month* + days logged even
  with a plan, which stays as a line (*Left in your plan: X* / *Over your plan by X*); See adds
  *Your typical month: ≈ X*; Plan and Grow lead with the plan; Optimize adds variable spending in the
  latest complete month against the start. No plan → spent, as before (UX-04).
- Reports *This month*: the running month's logging while observing; from Plan on, the month against
  its plan comes first. Over time (from See) and Wealth (at Grow) already opened by step (UX-14).
- Budget hero at Grow: the "set aside for your goals" line shows again (it lives in the plan sheet
  before then).
- Step unknown → the screens behave as before. Not here: Home's *Next for you* slot (not built yet)
  and the Optimize suggestions (UX-25 / VS-65).

**TDD Anchor:**

- Test: provider figures; `journeyFigures`; `useJourney` publishes them; `heroLead` at every step.
- Test: Home card lead lines (plan line, over plan, typical, variable, fr); Home at Observe with a plan.
- Test: Reports logging line at Observe, order before and from Plan; Budget set-aside line at Grow.

**Done when:** users at each step see the lead table 04 §7.3 documents, and nothing hides.

---
### VS-81: Where Variable Spending Has Room (UX-25, VS-65) 🔄 In Progress

**Priority:** P1 (docs/ux-redesign/06 UX-25; journey decision 3: suggestions only, on variable costs)
**Blocked by:** —

**Scope:**

- `journey.suggestions.cutSuggestions`: for each variable category of the starting point, what
  matching its own cheapest month would free each month (average − lowest, rounded down to 500
  FCFA so it never over-promises). The three biggest; a category that never varied is left out.
- `Journey.suggestions`, from the starting point profile `getJourney` already reads (approved
  `journey → reports`); empty before the starting point is recorded.
- The Optimize step on My path lists them under *Where you have room*: "Food: about 62 000 a month.
  Your cheapest month was 48 000." · "Matching it frees ≈ 14 000 a month". Each opens the category
  detail for this month by path. A note says they come from the first three months and are
  suggestions only; with none, the step says variable spending was steady.
- No target is set and nothing is stored. Not here: Home's *Next for you* "biggest saving lever"
  and the Budget tab's Optimize suggestions (04 §7.3).

**TDD Anchor:**

- Test: `cutSuggestions` (order, top 3, rounding, steady categories).
- Test: `getJourney` suggestions from a recorded starting point, none before.
- Test: Optimize step rows, opening the category detail, the none line, fr.

**Done when:** a user on Optimize sees where their own record shows room, and can open each category.

---
### VS-82: Fixes From the First Device Build 🔄 In Progress

**Priority:** P0 — pre-release (found on the user's device, 2026-10-26)
**Blocked by:** —

**Scope:**

- **Doubled wallets.** A new install seeds Cash, MTN MoMo and Orange Money with random uuids; when the
  phone held a record before its first sync (not a fresh-install restore), sync pushed them beside the
  user's own. `services/sync.wallets.adoptCloudWallets` now runs on a first sync before the push: a
  wallet never uploaded takes over the cloud wallet with the same name and type (case-insensitive) —
  its uuid and fields — keeping its local id, so entries logged on it stay attached. Later syncs never
  merge by name.
- **Hide a wallet.** The wallet screen offers *Hide this wallet* (soft delete; history stays; it
  leaves lists, pickers and totals) after a confirmation. The default wallet cannot be hidden; the
  screen says to make another the default first (edit form). Used to clean up existing duplicates.
- **Free cash readiness (04 §7.4).** While a wallet was never confirmed, a check is over 30 days old
  or spending sits outside every wallet, the card says *Not reliable yet* with the reasons and *Check
  balances* — no figure, no shortfall, no subtraction sheet. The hint moved under the label.
- **Why you spent.** Event rows show how many expenses they hold and a chevron (`ReasonEvent.count`).
  The imprévus footer shows only when it adds something (none yet, a total that differs from the
  Unexpected row, or last month); otherwise the count sits in the row. The event form says an event is
  for a one-off occasion; ongoing spending belongs in a category.
- **Reports, over plan.** "Left in your plan" with a negative amount now reads *Over your plan by* X.
- **Comparison.** The grouped bar chart is gone (months looked alike, labels cut, it repeated the
  list); each row reads "10 000 → 12 000 FCFA · +20%".

**TDD Anchor:**

- Test: first sync merges starter wallets into the cloud ones (fields, uuid, attached entry), keeps a
  starter the cloud lacks, never merges by name later.
- Test: hide with confirmation, cancel, default not hideable.
- Test: free cash not ready (never confirmed, unassigned), no sheet, ready again, fr.
- Test: event counts and chevron, reason count in row, footer rule; event form hint; over-plan label;
  comparison rows without the chart.

**Done when:** the user's device shows single wallets, no confident figure on unconfirmed balances,
and the Reports cards read clearly.

---
### VS-83: Home's Wallets Card Says What Its Balances Are Worth (F-11) 🔄 In Progress

**Priority:** P1 — pre-release (docs/ux-redesign/02 F-11; the rest of UX-21)
**Blocked by:** —

**Scope:**

- A total line under the wallet rows.
- How far the balances can be trusted, with the same rule as *Free cash* (UX-21): "Balances checked
  3 days ago" / "today"; when stale, "Balances not confirmed since 20 Sep" or "Some balances were
  never confirmed"; "48 expenses aren't in any wallet" when there are some; *Check balances ›* when
  either makes them doubtful. The card already opens Accounts, where balances are confirmed.
- `accounts.hooks.useWalletTrust` reads `getBalanceFreshness` and `getUnassignedSpending` (approved
  `dashboard → accounts`); a read failure hides the lines, never the balances.
- The card re-reads on focus; it used to read once at mount and could go stale while Home stayed open.

**TDD Anchor:**

- Test: total; fresh, stale, never confirmed; unassigned; the check line; re-read on focus; fr.

**Done when:** Home's wallet figures say when they were last confirmed, and nudge when they are not.

---
### VS-84: Next for You on Home (04 §7.3, 05 §10.3) 🔄 In Progress

**Priority:** P1 — pre-release (the last open item of the UX redesign plan)
**Blocked by:** —

**Scope:**

- `budget.committed.getDueItems(month)`: every payment due by month end, one line each — a recurring
  bill occurrence, an open planned purchase, a debt (each unpaid instalment) or a tontine
  contribution — with its label, amount and date, oldest first so overdue leads. `getCommitted` now
  sums these items, so Home's list and the Budget tab's *Due before month end* always agree.
- `dashboard/NextForYouCard` after quick log: the most urgent payment ("Bureau · 10 000 FCFA ·
  Overdue since 12 Oct"), and "+ N more" opening every payment due before month end by date.
  Read through the approved `dashboard → budget` edge; re-reads on focus.
- With nothing due, the journey step leads (04 §8.4): keep logging (Observe), see your first months
  (See), plan next month (Plan), see where you have room (Optimize), fund a goal (Grow). Unknown step
  → nothing.
- It replaces `PlannedDueCard` (planned purchases are in the list); the drawer dots are unchanged.

**TDD Anchor:**

- Test: `getDueItems` (order, one line per occurrence and instalment, repaid debts out, sums to the
  committed total); the existing committed-money tests guard the totals.
- Test: card (overdue/today/later wording, the sheet, no "more" with one item, prompts by step,
  nothing when unknown, fr).

**Done when:** Home always shows the next thing to pay, or the next step to take.

---

### VS-85: PIN After the Set-Up 🔄 In Progress

**Priority:** P1 — pre-release (first-run order)
**Blocked by:** —

**Scope:**

- A fresh install opens on the set-up (what the app does · wallets · reminder), not the PIN screen.
  The PIN is created once the set-up is finished or skipped: the user knows what the app is, and
  has entered balances worth protecting, before being asked to lock it.
- The PIN stays required. An existing PIN always locks first, before the set-up or the app.
- `auth.gate.pinGateView` decides wait / lock / app from the lock state and the set-up flag; the
  routing layer's `AuthGate` injects the flag (no new edge).
- The create-PIN prompt says why: *Keep your money private* — balances and spending stay on the
  phone (fr: *Gardez votre argent privé*).

**TDD Anchor:**

- Test: `pinGateView` (first run → set-up, set-up done → create PIN, existing PIN locks first,
  waits while either flag loads).
- Test: AuthScreen create prompt copy.

**Done when:** a fresh install sees what the app does before it is asked for a PIN.

---

### VS-86: French by Default, FR | EN During Set-Up 🔄 In Progress

**Priority:** P1 — pre-release (onboarding review, slice A)
**Blocked by:** VS-85

**Scope:**

- With no saved choice the app is in French, whatever the device says (`resolveLanguage(null)`).
  The old device rule is kept as `deviceLanguage`, used once by
  `auth.keepLanguageOfExistingInstall`: an install past its set-up with no saved choice gets the
  language it showed saved, so the update never switches it. Fresh installs stay unsaved.
- `components/LanguageToggle`: a compact FR | EN in the set-up header, beside *Skip*; "Step n of 3"
  moves above the title. Switching keeps the step, typed balances and the reminder time.
- Preferences offers Français / English (*System* removed); the screen is titled *Preferences* /
  *Préférences*, as in the drawer.
- The splash waits for the settings too, so the first screen is already in the saved language.
- Jest switches to English in `jest.setup.ts`; it no longer follows the mocked device.

**TDD Anchor:**

- Test: `resolveLanguage` / `deviceLanguage`; `keepLanguageOfExistingInstall` (existing install
  keeps en or fr, fresh stays null, a saved choice is never overwritten); `useAppSettings` reads an
  existing install in its old language.
- Test: `LanguageToggle` (active state, a11y names, no-op on the active one, group label).
- Test: set-up offers FR | EN on every step; switching keeps step, balances and time; Preferences
  defaults to French.

**Done when:** a fresh install on an English phone opens in French, and FR | EN works on every
set-up step without losing anything.

---

### VS-87: The First Screen Sells a Budget Built on Real Spending 🔄 In Progress

**Priority:** P1 — pre-release (onboarding review, slice B)
**Blocked by:** VS-86

**Scope:**

- Screen 1 (`onboarding/OnboardingIntro`): *A budget built on what you really spend*, then three
  stages instead of the path's five — Now · Observe, After 3 complete months · Plan, Then ·
  Optimize. Only "now" is emphasised; the complete-month rule sits under it ("8 days in 10",
  `COMPLETE_MONTH_COVERAGE`); a single muted line says a budget can be made now from estimates.
  See and Grow stay on My path.
- Wallets: the body says why balances are asked for; a privacy line comes before any amount —
  data stays on the phone, nothing is sent unless online backup is turned on, a PIN follows. No
  claim of encryption (the local database is not encrypted). "Not now" sits beside "Save" inside
  `OpeningBalancesStep`; the placeholder reads *Blank if you don't know*.
- Verified: supabase-js makes no request without a session; `syncNow` makes no cloud call
  signed out (test).

**TDD Anchor:**

- Test: three stages, See/Grow absent, only "now" current, rule and early-budget lines, French.
- Test: privacy line before the wallet fields; no footer "Not now" on the wallet step;
  `OpeningBalancesStep` "Not now" writes nothing; placeholder.
- Test: copy never claims encryption or security; the rule reads 8 in 10 in both languages.
- Test: `syncNow` signed out never calls `supabase.from`.

**Done when:** screen 1 answers what the app does, why observe, what to do and what comes next,
and the wallet step says where the data stays before asking for it.

---

### VS-88: Reminders That Help, and Say When They Can't 🔄 In Progress

**Priority:** P1 — pre-release (onboarding review, slice C)
**Blocked by:** VS-86

**Scope:**

- The reminder skips **logged days** only: an expense or a no-spend day, as Observe counts them
  (`services/transactions.getLoggedDays`). This narrows VS-57's "any entry": a day with only income
  or a transfer now gets the reminder, since it says nothing about spending.
- Copy without a deadline: the set-up asks *Want a gentle reminder?*, says it comes only when no
  spending is logged, tips "I spent nothing today", and points to Preferences. The notification
  reads *No spending logged today — Spent something, or nothing at all?*
- Refused permission is said: the set-up shows *Notifications are blocked…* and waits for
  *Continue*; in Preferences the switch stays off with the same line, which also shows when
  reminders are on but the phone blocks them (`notifications.hasPermission`, no prompt; re-checked
  on return to the app).
- Docs: GLOSSARY *Logged day*; 04 §8.2 (`ZeroDayGate` only prompts with reminders on).

**TDD Anchor:**

- Test: `getLoggedDays` counts expenses and no-spend days, not income or transfers.
- Test: `hasPermission` never prompts; reminder copy in both languages, no deadline wording.
- Test: set-up refusal shows the line and waits; Preferences keeps the switch off on refusal and
  warns when blocked.

**Done when:** nobody believes a reminder is coming when the phone will not deliver it, and the
reminder never sounds like a deadline.

---

### VS-89: The First Day on Home Says What to Do 🔄 In Progress

**Priority:** P1 — pre-release (onboarding review, slice D)
**Blocked by:** —

**Scope:**

- *Next for you* at Observe, with nothing due, follows today: nothing logged → *Today: log an
  expense, or say you spent nothing.* (opens the entry sheet); today logged → *Today's logged.
  Your first months are building at your own pace.* (opens My path). "Keep logging every day" is
  gone: a month counts at 8 days in 10. Due payments still come first; later steps unchanged.
  `DashboardScreen` passes today's status and the sheet opener.
- The path card at Observe says how many recent days have nothing logged (the 7-day missed-day
  window) and that My path catches them up.

**TDD Anchor:**

- Test: Observe prompt by today's status, the sheet vs My path, French, a due payment first.
- Test: path card missed-days line (singular/plural, none, not after Observe, French).

**Done when:** a new user sees one clear action on Home, with no pressure to log perfectly.

---

### VS-90: Optional, Anonymous Product Analytics 🔄 In Progress

**Priority:** P2 — product insight (requested 2026-10-29)
**Blocked by:** —

**Scope:**

- Shared `services/analytics`: typed catalogue (`analytics.schema`), allowlist (`analytics.sanitize`),
  consent gate and fire-and-forget `track`/`trackScreen` (`analytics.service`), PostHog EU adapter
  (`analytics.posthog`, the only SDK import). `posthog-react-native@4.81.0` + `expo-application`;
  no `expo-device`. All automatic collection off; anonymous only, no `identify`.
- Opt-in, off by default: *Help improve the app* on the set-up's first step (`OnboardingConsent`)
  and in Preferences. The choice lives in `ui_preferences.analytics_consent` (no migration).
  Turning it off discards the queue and the anonymous id.
- Events where outcomes are known: set-up steps, expense/income/debt create (+ validation and
  failure), edit, delete, repayments, budget writes, drawer rows, feedback, `app_opened`, route
  templates (`useAnalyticsLifecycle` in the root layout). Background writers send nothing.
- Wallets, balance checks, transfers, goals, tontines, planned purchases and events: one generic
  `feature_action_completed` per write through `trackedWrite` (failure → `operation_failed`,
  rethrown). A ticked planned item is a planned purchase, not `expense_created`.
- Docs: `docs/ANALYTICS.md` (catalogue, funnels, anomaly rules, setup, Data safety answers); privacy
  policy draft *Optional usage analytics*.

**TDD Anchor:**

- Test: allowlist drops unknown keys, bad values, concrete ids in routes; no prohibited key in the
  catalogue.
- Test: nothing sent or created before opt-in; withdrawal stops sending and disables the provider.
- Test: one `expense_created` per save; failure sends only the failure; provider throw still saves;
  retry is failure + one success; re-renders send nothing.
- Test: set-up sends steps only after the switch; Preferences switch on/off; one `app_opened` per
  launch; screen views only on route change.

**Done when:** opted-in usage shows in PostHog with no financial data, and nothing is sent without
consent. Before release: PostHog project set up, EAS key set, policy published, Data safety updated.

---

### VS-91: Income Sources the User Can Extend 🔄 In Progress

**Priority:** P2 — logging accuracy (requested 2026-10-31)
**Blocked by:** —

**Scope:**

- Migration 051: `income_sources` (key, name, parent_id, is_hidden, sort_order; synced) seeded with
  fixed ids and uuids `seed-income-source-<key>`: Salary, Freelance, Business / side business,
  Gift & family support, Other, and E-commerce under Business. `income.source` (CHECK to three tags)
  becomes `source_id`: table rebuilt, every row kept with its ids and sync state; e-commerce income
  lands under Business.
- Income slice: `incomeSources.service` (list, create one level deep, rename the user's own, hide/show;
  names unique among siblings, built-in labels included), `useIncomeSources`, picker with subsources,
  *New source* / *Add under …*, a Gift & family support hint (a loan is a debt; money passed on is not
  income), and *Manage sources* (`/income/sources`). Writes tracked as `income_source`.
- Shared readers: the Transactions feed and wallet history name income by its source; a source the
  user made takes its parent's icon.
- Sync and backups: `income_sources` before `income`; FKs mapped; built-ins count as install defaults;
  a cloud restore and a backup import put the built-ins back, and an old backup's tags become source
  ids. Supabase patch 053 (folded into 037 and schema.sql): table, `income.source_id`, a trigger that
  fills it from older builds' tag, and a backfill.

**TDD Anchor:**

- Test: migration seeds the six built-ins and moves salary/freelance/ecommerce income to ids 1/2/6
  with ids, uuids and sync state kept; changing a source marks the row pending.
- Test: names are trimmed, required and unique among siblings; no subsource of a subsource; built-ins
  cannot be renamed; hiding marks the source for sync.
- Test: picker shows visible sources, the subsources of the picked one, a hidden source in use, the
  gift hint; adds a source or a subsource and selects it; a refused name keeps the form open.
- Test: custom sources push with parent uuids and restore linked; built-ins are not pushed until
  changed; a pre-VS-91 backup imports.

**Done when:** a user can log income from "Gift from my brother" or a shop under Business, and old
income, backups and cloud data keep their sources. Before release: run Supabase patch 053.

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
