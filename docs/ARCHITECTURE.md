# Finance Gatekeeper — ExFeAr Architecture

## Project Structure Overview

```
├── app/                              # Routing Layer (thin entry points)
│   ├── _layout.tsx                   # Root layout (PIN gate, providers)
│   ├── index.tsx                     # Redirect to dashboard or auth
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── pin.tsx                   # PIN entry screen route
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Bottom tab bar layout
│   │   ├── dashboard.tsx             # Dashboard tab route
│   │   ├── transactions.tsx          # Transactions tab route
│   │   ├── budget.tsx                # Budget tab route
│   │   ├── projects.tsx              # Projects tab route
│   │   └── reports.tsx               # Reports tab route
│   ├── income/
│   │   ├── log.tsx                   # Log new income route
│   │   └── allocate.tsx              # Allocation screen after income entry
│   ├── expenses/
│   │   ├── log.tsx                   # Log expense route
│   │   ├── quick-add.tsx             # Quick-add grid route
│   │   ├── recurring.tsx             # Manage recurring expenses
│   │   └── categories.tsx            # Category/subcategory management
│   ├── budget/
│   │   └── settings.tsx              # Allocation percentages & priority config
│   ├── funds/
│   │   ├── index.tsx                 # Emergency fund + savings overview
│   │   └── [id].tsx                  # Individual fund detail
│   ├── projects/
│   │   ├── create.tsx                # Create new project
│   │   └── [id].tsx                  # Project detail & timeline
│   ├── debt/
│   │   ├── index.tsx                 # People ledger overview
│   │   ├── create.tsx                # Log new debt (lent or owed)
│   │   └── [id].tsx                  # Debt detail
│   └── reports/
│       ├── weekly.tsx                # Weekly report route
│       └── monthly.tsx               # Monthly report route
│
├── features/                         # FeatureSlices Layer (business logic)
│   └── finance/
│       ├── auth/
│       │   ├── AuthScreen.tsx                # PIN input UI
│       │   ├── auth.hooks.ts                 # useAuth, usePinValidation
│       │   ├── auth.service.ts               # PIN storage, verification logic
│       │   └── auth.types.ts                 # AuthState, PinConfig
│       │
│       ├── income/
│       │   ├── IncomeLogScreen.tsx            # Income entry form UI
│       │   ├── IncomeSourcePicker.tsx         # Salary / Freelance / E-commerce selector
│       │   ├── income.hooks.ts               # useIncomeLog, useIncomeHistory
│       │   ├── income.service.ts             # CRUD operations for income records
│       │   └── income.types.ts               # Income, IncomeSource
│       │
│       ├── expenses/
│       │   ├── ExpenseLogScreen.tsx           # Manual expense entry form
│       │   ├── QuickAddScreen.tsx             # Quick-add grid UI
│       │   ├── RecurringExpensesScreen.tsx    # Recurring expense management
│       │   ├── CategoryManager.tsx            # Category & subcategory CRUD UI
│       │   ├── ZeroDayPrompt.tsx              # "Did you spend nothing today?" modal
│       │   ├── TransactionList.tsx            # Filterable list of all transactions
│       │   ├── CategoryPicker.tsx             # Category/subcategory selector component
│       │   ├── expenses.hooks.ts             # useExpenseLog, useQuickAdd, useRecurring, useCategories, useZeroDay
│       │   ├── expenses.service.ts           # Expense CRUD, recurring logic, category CRUD
│       │   └── expenses.types.ts             # Expense, Category, Subcategory, QuickAddTemplate, RecurringExpense
│       │
│       ├── budget/
│       │   ├── AllocationScreen.tsx           # Allocation breakdown shown after income log
│       │   ├── BudgetOverview.tsx             # Category budgets with progress bars
│       │   ├── AllocationSettings.tsx         # Percentage & priority order config UI
│       │   ├── OverBudgetAlert.tsx            # Warning modal when expense exceeds category
│       │   ├── budget.hooks.ts               # useAllocation, useBudgetStatus, useOverBudgetCheck
│       │   ├── budget.service.ts             # Allocation calculation, redistribution logic, budget tracking
│       │   └── budget.types.ts               # Allocation, BudgetBucket, BucketPriority, MonthlyBudget
│       │
│       ├── funds/
│       │   ├── FundsOverview.tsx              # Emergency fund + savings combined view
│       │   ├── FundDetail.tsx                 # Individual fund progress, target, history
│       │   ├── FundProgressBar.tsx            # Visual progress toward target
│       │   ├── funds.hooks.ts                # useFunds, useFundProgress, useRedistribution
│       │   ├── funds.service.ts              # Fund CRUD, target tracking, auto-redistribution when target met
│       │   └── funds.types.ts                # Fund, FundType (emergency | savings), FundGoal
│       │
│       ├── projects/
│       │   ├── ProjectListScreen.tsx          # Priority-ranked project list
│       │   ├── ProjectDetail.tsx              # Funding progress, timeline, options
│       │   ├── ProjectForm.tsx                # Create/edit project form
│       │   ├── TimelineRecalcAlert.tsx        # "Your timeline shifted" alert with options
│       │   ├── projects.hooks.ts             # useProjects, useProjectTimeline, useProjectPriority
│       │   ├── projects.service.ts           # Project CRUD, timeline estimation, priority reorder
│       │   └── projects.types.ts             # Project, ProjectStatus, TimelineEstimate
│       │
│       ├── debt/
│       │   ├── DebtListScreen.tsx             # People ledger: lent and owed tabs
│       │   ├── DebtDetail.tsx                 # Individual debt with status and history
│       │   ├── DebtForm.tsx                   # Log new lent/owed entry
│       │   ├── debt.hooks.ts                 # useDebts, useDebtReminders
│       │   ├── debt.service.ts               # Debt CRUD, due date logic, settlement
│       │   └── debt.types.ts                 # Debt, DebtDirection (lent | owed), DebtStatus
│       │
│       ├── reports/
│       │   ├── WeeklyReport.tsx              # Weekly summary UI
│       │   ├── MonthlyReport.tsx             # Monthly full report UI
│       │   ├── MonthComparison.tsx           # Month-over-month comparison view
│       │   ├── SpendingBarChart.tsx           # Bar chart: category comparison
│       │   ├── SpendingPieChart.tsx           # Pie chart: category breakdown
│       │   ├── OptimizationSuggestions.tsx    # "Food spending up 18%" type insights
│       │   ├── reports.hooks.ts              # useWeeklyReport, useMonthlyReport, useComparison
│       │   ├── reports.service.ts            # Report generation, aggregation, trend analysis
│       │   └── reports.types.ts              # WeeklyReport, MonthlyReport, Trend, Comparison
│       │
│       └── dashboard/
│           ├── DashboardScreen.tsx            # Main overview: budget remaining, fund status, quick actions
│           ├── BudgetSummaryCard.tsx          # Remaining budget at a glance
│           ├── FundStatusCard.tsx             # Emergency + savings progress mini view
│           ├── QuickActionBar.tsx             # Shortcuts to log expense, income, zero-day
│           ├── dashboard.hooks.ts            # useDashboard (aggregates data from other features)
│           └── dashboard.types.ts            # DashboardState
│
├── components/                       # Shared UI Primitives
│   ├── Button.tsx
│   ├── Typography.tsx
│   ├── TextInput.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── ProgressBar.tsx
│   ├── TabBar.tsx
│   ├── EmptyState.tsx
│   ├── Badge.tsx
│   └── ConfirmDialog.tsx
│
├── services/                         # Shared External Services
│   ├── supabase.ts                   # Supabase client init, auth helpers
│   ├── database.ts                   # SQLite connection, migration runner
│   └── sync.ts                       # Local-to-cloud sync logic
│
├── hooks/                            # Shared Utility Hooks
│   ├── useDebounce.ts
│   ├── useAppState.ts                # App foreground/background detection
│   └── useStorage.ts                 # Async storage wrapper
│
├── utils/                            # Pure Helper Functions
│   ├── formatCurrency.ts             # Format number to FCFA display
│   ├── formatDate.ts                 # Date formatting helpers
│   ├── calculatePercentage.ts        # Percentage math for allocations
│   └── generateId.ts                 # Unique ID generation
│
├── notifications/                    # Shared Notification Infrastructure
│   ├── notifications.service.ts      # Schedule, cancel, manage local notifications
│   ├── notifications.config.ts       # Notification channel setup, default messages
│   ├── notifications.types.ts        # NotificationType, NotificationPayload
│   └── triggers/
│       ├── dailyReminder.ts          # End-of-day logging reminder trigger
│       ├── zeroDayCheck.ts           # Zero-day confirmation trigger
│       ├── overBudget.ts             # Over-budget alert trigger
│       ├── debtDueDate.ts            # Debt reminder trigger
│       └── projectTimeline.ts        # Project timeline change trigger
│
├── constants/
│   ├── categories.ts                 # Default categories and subcategories
│   ├── colors.ts                     # App color palette
│   └── config.ts                     # App-wide configuration values
│
├── types/
│   └── global.ts                     # Shared TypeScript types used everywhere
│
└── assets/
    ├── fonts/
    └── images/
```

---

## Dependency Rules

### What can import what

```
app/ ──────────► features/finance/*
                      │
                      ▼
               components/
               services/
               hooks/
               utils/
               notifications/
               constants/
               types/
```

### Rules enforced

| From                 | Can import                                      | Cannot import          |
| -------------------- | ----------------------------------------------- | ---------------------- |
| `app/` routes        | Features, Shared infra                          | Nothing imports routes |
| `features/finance/*` | Other features (with caution), all shared infra | Routes                 |
| `components/`        | `utils/`, `constants/`, `types/`                | Features, Routes       |
| `services/`          | `utils/`, `constants/`, `types/`                | Features, Routes       |
| `hooks/`             | `utils/`, `services/`                           | Features, Routes       |
| `utils/`             | `constants/`, `types/` only                     | Everything else        |
| `notifications/`     | `utils/`, `constants/`, `types/`                | Features, Routes       |

### Cross-feature imports

Some features legitimately need each other. These are the **approved cross-feature dependencies**:

| Feature     | Can import from                                                                               |
| ----------- | --------------------------------------------------------------------------------------------- |
| `dashboard` | `expenses`, `budget`, `funds`, `projects`, `debt` (read-only aggregation)                     |
| `budget`    | `expenses` (reads categories), `funds` (triggers redistribution)                              |
| `reports`   | `expenses`, `income`, `budget`, `funds`, `projects`, `debt` (read-only for report generation) |
| `income`    | `budget` (triggers allocation screen after income log)                                        |
| `funds`     | `budget` (reads allocation percentages)                                                       |
| `projects`  | `budget` (reads allocation percentages)                                                       |

All other cross-feature imports are **forbidden** unless explicitly justified and documented.

---

## Route-to-Feature Mapping

Every route file is thin. It imports a screen component from a feature and renders it. Nothing else.

```tsx
// app/(tabs)/dashboard.tsx — EXAMPLE
import { DashboardScreen } from "@/features/finance/dashboard/DashboardScreen";

export default function DashboardRoute() {
  return <DashboardScreen />;
}
```

Route files must never contain:

- Business logic
- API calls
- State management
- UI beyond the imported screen component

---

## Database Schema Location

The SQLite schema, migrations, and seed data live in `services/database.ts` and a dedicated migrations folder:

```
services/
├── database.ts           # Connection, migration runner
└── migrations/
    ├── 001_create_tables.ts
    ├── 002_seed_defaults.ts
    └── ...
```

This is shared infrastructure because every feature reads/writes to the same local database. Feature services (e.g., `expenses.service.ts`) call database helpers — they never open raw SQLite connections directly.

---

## Naming Conventions

| Item              | Convention                                   | Example                       |
| ----------------- | -------------------------------------------- | ----------------------------- |
| Feature screen    | `PascalCase` + Screen suffix                 | `ExpenseLogScreen.tsx`        |
| Feature component | `PascalCase`                                 | `CategoryPicker.tsx`          |
| Hooks file        | `[feature].hooks.ts`                         | `expenses.hooks.ts`           |
| Service file      | `[feature].service.ts`                       | `budget.service.ts`           |
| Types file        | `[feature].types.ts`                         | `debt.types.ts`               |
| Shared component  | `PascalCase`                                 | `Button.tsx`                  |
| Utility function  | `camelCase`                                  | `formatCurrency.ts`           |
| Route file        | `kebab-case` or Expo Router convention       | `quick-add.tsx`               |
| Constants         | `camelCase` file, `UPPER_SNAKE_CASE` exports | `colors.ts` → `PRIMARY_GREEN` |

---

## Feature Slice Checklist

Before creating any new feature, verify:

- [ ] Does it represent a distinct business domain?
- [ ] Can it function without importing other features (except approved dependencies)?
- [ ] Does it contain its own screens, hooks, service, and types?
- [ ] Is every reusable piece extracted to shared infrastructure?
- [ ] Are all imports using `@/` absolute paths?
- [ ] Is the route file thin (no logic, just renders the feature screen)?
