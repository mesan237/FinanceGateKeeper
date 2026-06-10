# Finance Gatekeeper — Root Context

## Project Overview
Personal finance app for tracking income, expenses, budgets, savings, and project funding. Built for a single user in Central/West Africa. Currency: FCFA only.

## Tech Stack
- **Framework:** React Native with Expo (Expo Router for navigation)
- **Language:** TypeScript (strict mode)
- **Local DB:** SQLite via expo-sqlite
- **Cloud:** Supabase (auth + backup sync)
- **Charts:** react-native-chart-kit or Victory Native
- **Notifications:** Expo Notifications (local scheduled)
- **Testing:** Jest + React Native Testing Library

## Architecture: ExFeAr (ExpoRouter FeatureSlices Architecture)
Three layers — never violate these:
1. `app/` — Routing layer. Thin entry points only. No business logic, no API calls, no state.
2. `features/finance/` — FeatureSlices. Self-contained by domain.
3. Root folders (`components/`, `services/`, `hooks/`, `utils/`, `notifications/`, `constants/`, `types/`) — Shared infrastructure. Never imports from features or routes.

**Golden Rule:** Domain-specific → `features/`. Reusable → root folders. Route → `app/`.

## Import Rules
- Always use `@/` absolute path alias. Never relative paths crossing directory boundaries.
- Routes import features. Features import shared infra. Features can import other features only per approved dependency list.
- Shared infra NEVER imports from features or routes.

## Approved Cross-Feature Dependencies
- `dashboard` → reads from `expenses`, `budget`, `funds`, `projects`, `debt`
- `budget` → reads from `expenses` (categories), `funds` (redistribution), `projects` (funds on allocation confirm)
- `reports` → reads from `expenses`, `income`, `budget`, `funds`, `projects`, `debt`
- `income` → calls `budget` (triggers allocation after income log)
- `funds` → reads `budget` (allocation percentages)
- `projects` → reads `budget` (allocation percentages)
- `expenses` → reads `budget` (pre-save over-budget check on the log/quick-add screens)
All other cross-feature imports are forbidden.

## Naming Conventions
- Feature screens: `PascalCase` + Screen suffix → `ExpenseLogScreen.tsx`
- Feature components: `PascalCase` → `CategoryPicker.tsx`
- Hooks: `[feature].hooks.ts` → `expenses.hooks.ts`
- Services: `[feature].service.ts` → `budget.service.ts`
- Types: `[feature].types.ts` → `debt.types.ts`
- Shared components: `PascalCase` → `Button.tsx`
- Utils: `camelCase` → `formatCurrency.ts`
- Routes: Expo Router conventions → `quick-add.tsx`
- Constants: `camelCase` file, `UPPER_SNAKE_CASE` exports

## Testing Standards (TDD)
Every implementation follows Red-Green-Refactor:
1. Write failing test FIRST.
2. Implement minimum code to pass.
3. Refactor without breaking tests.

- Services/hooks/utils → Jest unit tests (`__tests__/[name].test.ts`)
- Screen components → React Native Testing Library (`__tests__/[name].test.tsx`)
- Test files colocate with source: `features/finance/expenses/__tests__/expenses.service.test.ts`
- No mocking SQLite in service tests — use an in-memory SQLite instance.
- Test names describe behavior: `it('rejects expense with zero amount')`, not `it('test1')`.

## Commit Format
```
feat(expenses): add manual expense logging with category picker
test(expenses): add service and screen tests for expense logging
fix(budget): correct percentage redistribution when fund target met
```
Pattern: `type(scope): description` — scope matches feature folder name.

## Code Style
- Functional components only. No class components.
- Hooks for all state management. No external state libraries unless justified.
- Every exported function has a JSDoc comment explaining what it does.
- No `any` types. Ever.
- Prefer early returns over nested conditionals.
- Max file length: 300 lines. Split if longer.
