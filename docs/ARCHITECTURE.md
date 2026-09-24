# Finance Gatekeeper — ExFeAr Architecture

## Project Structure Overview

All application code lives under `src/`. The path alias `@/*` (in `tsconfig.json`) resolves to `./src/*`, so every import in this doc and the codebase uses `@/<area>/...`.

```
src/
├── app/                              # Routing Layer (thin entry points)
│   ├── _layout.tsx                   # Root layout (PIN gate, providers)
│   ├── index.tsx                     # Redirect to dashboard or auth
│   ├── profile/
│   │   ├── index.tsx                 # Profile (name, avatar, account) route
│   │   └── change-pin.tsx            # Change-PIN route
│   │                                 # (the PIN lock itself is gated in _layout.tsx — no standalone route)
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
│       ├── auth/                             # PIN lock, profile & app settings (owns the users row)
│       │   ├── AuthProvider.tsx              # PIN lock state + AuthGate context
│       │   ├── AuthScreen.tsx                # PIN setup/unlock UI
│       │   ├── PinKeypad.tsx                 # Numeric keypad + progress dots
│       │   ├── ChangePinScreen.tsx           # Change-PIN flow (current→new→confirm)
│       │   ├── PinRecoveryScreen.tsx         # Forgot-PIN recovery (cloud verify / wipe)
│       │   ├── ProfileScreen.tsx             # Display name + avatar editor
│       │   ├── ProfileAvatar.tsx             # Initials/emoji avatar (no image upload)
│       │   ├── SettingsScreen.tsx            # Reminder, appearance, cloud
│       │   ├── CloudAccountCard.tsx          # Shared cloud sign-in/out card
│       │   ├── auth.service.ts               # PIN hash/verify (expo-crypto), app settings
│       │   ├── auth.profile.ts               # Profile get/set
│       │   ├── auth.hooks.ts                 # useAppSettings, useProfile, useActionBarStyle
│       │   └── auth.types.ts                 # PinState, Profile, AppMode, AppSettings
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
└── types/
    └── global.ts                     # Shared TypeScript types used everywhere

assets/                               # Static assets at repo root (referenced via @/assets/*)
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
| `dashboard` | `expenses`, `budget`, `funds`, `projects`, `debt` (read-only aggregation); `accounts` (Wallets summary section) |
| `budget`    | `expenses` (reads categories and per-category spend for the monthly envelopes, VS-33), `funds` (triggers redistribution), `projects` (funds on allocation confirm), `income` (reads held/pending income and marks it allocated — unallocated-pool screen, VS-19) |
| `expenses`  | `budget` (pre-save over-budget checks — month-wide and per-category envelope — on the expense log, detail, and quick-add screens); `income` (the unified Add-Transaction sheet on the Transactions tab composes income entry); `accounts` (AccountPicker on the expense log and detail screens) |
| `reports`   | `expenses`, `income`, `budget`, `funds`, `projects`, `debt` (read-only for report generation) |
| `income`    | `budget` (triggers allocation screen after income log); `accounts` (AccountPicker on the income log screen) |
| `funds`     | `budget` (reads allocation percentages); `accounts` (reserved — `depositToFund` accepts an `accountId`; manual-deposit picker UI deferred, fund deposits are allocation-driven) |
| `projects`  | `budget` (reads allocation percentages); `accounts` (AccountPicker on the manual contribution section) |

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

The SQLite schema, migrations, and seed data live in `src/services/database.ts` and a dedicated migrations folder:

```
src/services/
├── database.ts           # Connection, migration runner
└── migrations/
    ├── 001_create_tables.ts
    ├── 002_seed_defaults.ts
    └── ...
```

This is shared infrastructure because every feature reads/writes to the same local database. Feature services (e.g., `src/features/finance/expenses/expenses.service.ts`) call database helpers — they never open raw SQLite connections directly.

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

---

## Claude Code Configuration

The `.claude/` directory and `CLAUDE.md` files are scaffolded **before VS-01**. Every implementation task afterward runs under these rules.

### CLAUDE.md File Hierarchy

Each `CLAUDE.md` is scoped to its directory. Claude loads the nearest one when working in that area.

| Location                                          | Scope of rules it carries                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `CLAUDE.md` (root)                                | Project overview, tech stack, ExFeAr summary, import rules, naming, TDD, commit format.                |
| `AGENTS.md` (root)                                | Project-wide rules: Expo v55 doc lookup, FCFA-only currency, TDD discipline, dependency-rules summary. |
| `src/app/CLAUDE.md`                               | Thin-route rule. Route files render a feature screen and nothing else.                                 |
| `src/features/finance/CLAUDE.md`                  | Feature-slice conventions: file naming, hook/service split, approved cross-feature imports.            |
| `src/features/finance/<slice>/CLAUDE.md`          | Per-slice domain context: tables owned, business rules, file list. One per slice.                      |
| `src/services/CLAUDE.md`                          | Migration-runner rules; database helpers; sync rules.                                                  |
| `src/notifications/CLAUDE.md`                     | Trigger registration pattern, channel/permission setup.                                                |

### Subagents (`.claude/agents/`)

| Agent           | File                              | Role                                                                                                                                                                                                       |
| --------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code-reviewer` | `.claude/agents/code-reviewer.md` | Read-only review of branch diffs. Checks dependency rules, route-file thinness, naming conventions, FCFA-only currency, TDD coverage on new logic, and forbidden cross-feature imports. Invoked per slice. |

### Utility Skills (`.claude/commands/`)

Low-level helpers invoked directly or composed by the workflow commands below.

| Skill            | File                                | What it does                                                                                                                |
| ---------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/new-slice`     | `.claude/commands/new-slice.md`     | Scaffolds a feature slice under `src/features/finance/<name>/`: `Screen.tsx`, `*.hooks.ts`, `*.service.ts`, `*.types.ts` stubs. |
| `/new-migration` | `.claude/commands/new-migration.md` | Generates the next numbered file in `src/services/migrations/` with up/down stubs and registers it with the runner.            |
| `/check-arch`    | `.claude/commands/check-arch.md`    | Scans the diff for dependency-rule violations and forbidden cross-feature imports.                                          |
| `/log-slice`     | `.claude/commands/log-slice.md`     | Updates the KANBAN.md status table for a vertical slice (Backlog → In Progress → Done).                                     |

### Workflow Commands (`.claude/commands/workflows/`)

Top-level entry points for everyday work. These read the issue file, optionally invoke utility skills, and drive the implementation loop.

| Command                                  | When to type it                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| `/workflows:fast ISSUE-00X`              | Simple tasks — one pattern, no design decisions.                              |
| `/workflows:full:implement ISSUE-00X`    | All milestone subtasks. The main daily command.                              |
| `/workflows:full:approved`               | After reviewing the plan or the implementation. Signals go-ahead to proceed. |
| `/workflows:full:review-todo ISSUE-00X`  | Before starting a milestone — validates coverage of the implementation plan. |

### Issues Backlog (`issues/`)

A flat folder of markdown files. Not a project-management tool — just files Claude can read.

- **Layout:** `issues/ISSUE-00X/implementation-plan.md` per slice. Each file maps to one KANBAN `VS-XX`.
- **Contents:** problem statement, user stories, implementation decisions reached during the Grill Me phase, testing decisions. Cuts vertically through database → service → hooks → UI → route (mirrors KANBAN's vertical-slice model).
- **Purpose:** the implementation plan is the document Claude Code reads **before writing a single line**. The KANBAN gives the board view; the issue file gives the working spec.

### Backlog Injection (`scripts/once.sh`)

A bash script that `cat`s every markdown file under `issues/` into a single string and passes it as part of the agent prompt. Claude gets the full outstanding backlog in one shot, then picks the next task by priority:

1. Critical bug fixes
2. Tracer bullets (thin end-to-end slices)
3. Net-new feature work
4. Polishing / refactoring (lowest)

### Doc-Rot Prevention

When an issue is complete, its file is **deleted** (or moved to `issues/done/`). The `issues/` folder reflects only outstanding work. Permanent documentation lives in `docs/`, never in `issues/`. This stops Claude from being misled by stale plans on subsequent runs.

### AFK Loop

`once.sh` + `/workflows:full:implement` enable an autonomous loop: the agent reads the injected backlog, selects the highest-priority issue, drafts a plan, waits for `/workflows:full:approved`, implements, deletes the completed issue file, and repeats. Human review is concentrated at the approval checkpoint rather than between every keystroke.

### Settings (`.claude/settings.json`)

Enables the official `expo` plugin so versioned Expo docs are available during implementation. Permissions, hooks, and additional plugins are added per slice as needs surface — none are required to start.

### Order of Construction

1. Write `.claude/` (settings, agents, commands, workflows) and all `CLAUDE.md` files. Commit as one standalone change.
2. Write `scripts/once.sh` and create the `issues/` folder.
3. For each slice in KANBAN order: write `issues/ISSUE-00X/implementation-plan.md`, run `/workflows:full:review-todo ISSUE-00X`, then `/workflows:full:implement ISSUE-00X`, approve with `/workflows:full:approved`, delete the completed issue file.
4. Changes to anything under `.claude/`, any `CLAUDE.md`, or `scripts/once.sh` ship in their own commit so the audit trail of rule changes stays clean.
