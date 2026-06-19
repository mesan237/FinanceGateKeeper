# Finance Gatekeeper

A personal finance app for tracking income, expenses, budgets, savings, and project funding. Built mobile-first with React Native + Expo for a single user in Central/West Africa.

> **Currency:** FCFA only. All amounts are whole numbers (FCFA has no decimals) and are stored as integers throughout the app and database.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Architecture (ExFeAr)](#architecture-exfear)
- [Project Structure](#project-structure)
- [Database & Migrations](#database--migrations)
- [Testing](#testing)
- [Conventions](#conventions)
- [Roadmap](#roadmap)
- [Contributing Workflow](#contributing-workflow)

---

## What It Does

The app is built as a series of **vertical slices** — each one cuts through every layer (database → service → hooks → UI → route) so that every completed slice works end to end. The following is **implemented and tested today**:

| Area | Capability |
| --- | --- |
| **Expense logging** | Log an expense with amount, category/subcategory, optional note, and date. Browse a filterable, chronological transaction list. |
| **Categories** | Eight seeded default categories with subcategories, plus full CRUD — add, rename, hide/unhide, reorder, and delete-with-reassignment (so no expense is ever orphaned). Default categories can be hidden but not deleted. |
| **Income logging** | Log income tagged by source (Salary / Freelance / E-commerce) and view a source-tagged history. |
| **Budget allocation** | Split monthly income across four buckets — Emergency Fund, Savings, Projects, Expenses — with editable percentages and priority order, locked per month. Track spent-vs-allocated with a budget overview. |
| **Quick-Add** | One-tap template tiles (e.g. "Taxi 500", "Lunch 1 500") that log an expense instantly — no form. Long-press to edit, `+` tile to create. |
| **Recurring expenses** | Register recurring bills (monthly/weekly). On app open, due occurrences **auto-log** at their due date — idempotent and replay-safe (missed months are backfilled into the correct budget month). Toggle active/inactive, or skip a single occurrence without logging. |
| **PIN lock** | A 4-digit PIN (salted SHA-256, device-local) gates the app on launch. First run forces setup; 3 wrong entries trigger a 30s cooldown. **Forgot-PIN recovery** resets the PIN via cloud-account re-authentication (no data loss), or — for users with no cloud backup — a confirm-guarded device wipe. |
| **Profile** | An editable display name and on-device avatar (name initials or an emoji on a chosen color — no photo upload), plus the cloud account and Change-PIN entry. |

> **Status:** Active development. The app currently spans PIN lock & profile, income/expense/budget tracking, categories, funds, projects, debt, accounts & transfers, dashboard, reports, and Supabase cloud sync. See [`docs/KANBAN.md`](docs/KANBAN.md) for the authoritative per-slice status.

---

## Tech Stack

- **Framework:** [Expo](https://expo.dev) ~55 with [Expo Router](https://docs.expo.dev/router/introduction/) (file-based navigation)
- **Runtime:** React Native 0.83 · React 19.2
- **Language:** TypeScript 5.9 (strict mode, no `any`)
- **Local database:** SQLite via [`expo-sqlite`](https://docs.expo.dev/versions/latest/sdk/sqlite/) with a custom migration runner
- **Local auth:** 4-digit PIN hashed with [`expo-crypto`](https://docs.expo.dev/versions/latest/sdk/crypto/) (salted SHA-256); session persisted via `expo-secure-store`
- **Notifications:** [`expo-notifications`](https://docs.expo.dev/versions/latest/sdk/notifications/) (local scheduled)
- **Cloud:** Supabase for account auth + backup sync
- **Testing:** [Jest](https://jestjs.io/) (`jest-expo`) + [React Native Testing Library](https://callstack.github.io/react-native-testing-library/); `better-sqlite3` provides a real in-memory SQLite engine for service tests

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (developed on Node 22)
- **npm**
- For native runs: **Android Studio** (emulator) and/or **Xcode** (iOS simulator, macOS only). You can also use [Expo Go](https://expo.dev/go) for quick iteration.

### Install

```bash
npm install
```

### Run

```bash
npm start          # Start the Expo dev server (choose a target from the menu)
npm run android    # Build & run on an Android device/emulator (expo run:android)
npm run ios        # Build & run on an iOS simulator (expo run:ios)
npm run web        # Run in the browser
```

The database is created and all pending migrations run automatically on first launch — no manual setup step.

---

## Available Scripts

| Script | What it does |
| --- | --- |
| `npm start` | Start the Expo development server. |
| `npm run android` | Build and launch on Android (`expo run:android`). |
| `npm run ios` | Build and launch on iOS (`expo run:ios`). |
| `npm run web` | Run the app in a web browser. |
| `npm test` | Run the full Jest test suite. |
| `npm run test:watch` | Run Jest in watch mode. |
| `npm run lint` | Run Expo's ESLint config. |
| `npm run reset-project` | Reset to a blank starter (Expo scaffold helper — destructive). |

---

## Architecture (ExFeAr)

**ExFeAr** = **Ex**poRouter **Fe**atureSlices **Ar**chitecture. Three layers, with strict, one-directional dependencies:

```
app/ ──────────► features/finance/*
                      │
                      ▼
               components/  services/  hooks/
               utils/  notifications/  constants/  types/
```

1. **`app/` — Routing layer.** Thin entry points only. A route file imports a feature screen and renders it. **No business logic, no API calls, no state.**
2. **`features/finance/` — Feature slices.** Self-contained business domains. Each slice owns its screens, hooks, service, and types.
3. **Root folders — Shared infrastructure.** Reusable primitives (`components/`), DB/clients (`services/`), helpers (`utils/`), etc. **Shared infra never imports from features or routes.**

**Golden Rule:** Domain-specific → `features/`. Reusable → root folders. Route → `app/`.

### Import rules

- Always use the `@/` absolute path alias (resolves to `src/`). No relative paths that cross directory boundaries.
- `features/` may import shared infra freely; cross-feature imports are restricted to an approved list.
- `services/`, `utils/`, `components/`, etc. **must not** import from `features/` or `app/`.
- `utils/` may import only from `constants/` and `types/`.
- Raw `expo-sqlite` is used **only** inside `services/`; feature services call the `services/database.ts` helpers.

### Approved cross-feature dependencies

| Feature | May read from |
| --- | --- |
| `dashboard` | `expenses`, `budget`, `funds`, `projects`, `debt` |
| `budget` | `expenses` (categories), `funds` (redistribution) |
| `reports` | `expenses`, `income`, `budget`, `funds`, `projects`, `debt` |
| `income` | `budget` (triggers allocation after income log) |
| `funds` | `budget` (allocation percentages) |
| `projects` | `budget` (allocation percentages) |

All other cross-feature imports are forbidden. The `/check-arch` skill scans branch diffs for violations.

---

## Project Structure

```
src/
├── app/                              # Routing layer (thin Expo Router entry points)
│   ├── _layout.tsx                   # Root layout; wraps the stack with RecurringAutoLogger
│   ├── index.tsx
│   ├── (tabs)/                       # Bottom tab bar: dashboard, transactions, budget, projects, reports
│   ├── expenses/                     # log, quick-add, recurring, categories
│   ├── income/                       # log, allocate
│   └── budget/                       # settings
│
├── features/finance/                 # Feature slices (business logic)
│   └── expenses/                     # Screens, *.hooks.ts, *.service.ts, *.types.ts, __tests__/
│       ├── ExpenseLogScreen.tsx      TransactionList.tsx     CategoryManager.tsx
│       ├── CategoryPicker.tsx        QuickAddScreen.tsx      QuickAddTemplateForm.tsx
│       ├── RecurringExpensesScreen.tsx  RecurringExpenseForm.tsx  RecurringAutoLogger.tsx
│       ├── expenses.service.ts       # All DB operations for the domain
│       ├── expenses.hooks.ts         # useExpenseLog, useTransactions, useCategories, useQuickAdd, useRecurring
│       └── expenses.types.ts
│   └── income/ , budget/             # Same four-file slice layout
│
├── components/                       # Shared UI primitives (Button, TextInput, Typography, Modal, …)
├── services/
│   ├── database.ts                   # SQLite connection, query helpers, migration runner
│   └── migrations/                   # Numbered, registered migrations (001 … 007)
├── hooks/        utils/        notifications/        constants/        types/
```

Each major directory carries a scoped `CLAUDE.md` documenting its rules. The full architecture spec lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); the slice board is in [`docs/KANBAN.md`](docs/KANBAN.md).

---

## Database & Migrations

- **Engine:** SQLite via `expo-sqlite`, opened as a singleton in [`src/services/database.ts`](src/services/database.ts).
- **Migrations** live in [`src/services/migrations/`](src/services/migrations/), are numbered, and are registered in [`migrations/index.ts`](src/services/migrations/index.ts). The runner applies any not yet recorded in a `_migrations` ledger table — running it twice is a no-op.
- **Amounts** are stored as integers (FCFA has no decimals). **Dates** are ISO 8601 strings (`YYYY-MM-DD`, or full timestamps for `created_at`), anchored to UTC so month/day boundaries stay stable across timezones.

Migrations applied so far:

| # | Table / change |
| --- | --- |
| 001 | `categories` (+ seeds the eight default categories and subcategories) |
| 002 | `expenses` (+ indexes on `date` and `category_id`) |
| 003 | adds `is_hidden` to `categories` |
| 004 | `income` |
| 005 | `allocations` (one row per `YYYY-MM` month) |
| 006 | `quick_add_templates` |
| 007 | `recurring_expenses` (+ index on `is_active, next_due_date`) |

---

## Testing

The project follows **TDD (Red → Green → Refactor)**: a failing test is written first, then the minimum code to pass, then refactor.

```bash
npm test
```

- **Services / hooks / utils** → Jest unit tests. Service tests run against a **real in-memory `better-sqlite3` instance** (no SQLite mocking) so the actual migrations and SQL execute.
- **Screens** → React Native Testing Library, asserting behavior the user would see.
- Tests colocate with source under `__tests__/` (e.g. `features/finance/expenses/__tests__/expenses.service.test.ts`).

Current suite: **182 tests across 23 suites, all passing.**

---

## Conventions

**Naming**

| Item | Convention | Example |
| --- | --- | --- |
| Feature screen | `PascalCase` + `Screen` | `ExpenseLogScreen.tsx` |
| Feature component | `PascalCase` | `CategoryPicker.tsx` |
| Hooks / service / types | `[feature].hooks.ts` etc. | `expenses.service.ts` |
| Utility | `camelCase` | `formatCurrency.ts` |
| Route | kebab-case / Expo Router | `quick-add.tsx` |

**Code style**

- Functional components and hooks only — no class components, no external state libraries unless justified.
- No `any`. Strict TypeScript throughout.
- Every exported function carries a JSDoc comment.
- Prefer early returns over nested conditionals. Max ~300 lines per file.

**Commits:** `type(scope): description`, where `scope` matches the feature folder — e.g. `feat(expenses): add quick-add templates and recurring expenses`.

---

## Roadmap

Tracked in [`docs/KANBAN.md`](docs/KANBAN.md) (authoritative). **VS-01 → VS-22** are largely complete — PIN lock & profile (VS-02/VS-22), logging, budget, funds, projects, debt, dashboard, reports, transaction UX, accounts & transfers, deferred income allocation, and Supabase sync. In progress: **VS-21** (Reports visual redesign).

---

## Contributing Workflow

This repo is built with an issue-driven, slice-at-a-time workflow:

1. Each slice has a spec under `issues/ISSUE-00X/implementation-plan.md` (maps to a `VS-XX` on the board).
2. Implement the slice in TDD order: migration → service → hooks → UI → route, tests first.
3. Run `/check-arch` to confirm no dependency-rule violations, then a code review of the branch diff.
4. Mark the slice `✅ Done` in `docs/KANBAN.md`.

Before writing code, read the relevant `CLAUDE.md` files — they carry the rules that are enforced during review.
