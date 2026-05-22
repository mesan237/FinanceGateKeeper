# ISSUE-001 — Phase 2 Execution Plan

**Status:** Approved 2026-05-22.
**Maps to:** KANBAN VS-01.

## Pre-implementation cleanup (Expo template removal)

The repo still has the Expo Router starter (Home/Explore tabs, themed-* components, `global.css`, `theme.ts`). These conflict with the 5-tab `(tabs)` group the plan creates. Delete:

- `src/app/explore.tsx`
- `src/components/animated-icon.tsx`, `animated-icon.web.tsx`, `animated-icon.module.css`
- `src/components/app-tabs.tsx`, `app-tabs.web.tsx`
- `src/components/external-link.tsx`, `hint-row.tsx`, `themed-text.tsx`, `themed-view.tsx`, `web-badge.tsx`
- `src/components/ui/collapsible.tsx` (and the empty `ui/` folder)
- `src/global.css`
- `src/constants/theme.ts`

Rewrite in place:
- `src/app/_layout.tsx` → minimal root Stack hosting the `(tabs)` group.
- `src/app/index.tsx` → `<Redirect href="/(tabs)/dashboard" />`.

## TDD-ordered subtasks

### 1. Toolchain
- Modify `package.json`:
  - devDeps: `jest`, `jest-expo`, `@testing-library/react-native`, `@testing-library/jest-native`, `@types/jest`, `react-test-renderer@19.2.0`, `better-sqlite3`, `@types/better-sqlite3`.
  - runtime deps (`npx expo install`): `expo-sqlite`, `expo-notifications`.
  - scripts: `"test": "jest"`, `"test:watch": "jest --watch"`.
- Create `jest.config.js` — `preset: jest-expo`, `setupFilesAfterEach: ['<rootDir>/jest.setup.ts']`, `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }`.
- Create `jest.setup.ts` — registers `@testing-library/jest-native/extend-expect`.

### 2. Database layer (RED → GREEN)
1. **RED:** `src/services/__tests__/database.test.ts`
   - `runMigrations` applies pending migrations in numeric order.
   - `_migrations` table records `(id, name, applied_at)` per migration.
   - second `runMigrations` is a no-op.
   - `closeDb` releases the lock; subsequent `getDb()` succeeds.
   - fresh DB opens cleanly.
2. **GREEN:**
   - `src/services/database.ts` — exports `getDb()`, `closeDb()`, `runMigrations(db)`, `execute(sql, params)`, `query<T>(sql, params)`. Runtime uses `expo-sqlite`; migration runner takes an injected `SqliteDriver` so tests pass a `better-sqlite3` adapter.
   - `src/services/migrations/index.ts` — ordered registry array.
   - `src/services/migrations/001_create_migrations_table.ts` — `up()` creates the `_migrations` table.

### 3. Constants
- `src/constants/colors.ts` — `PRIMARY_GREEN`, `BACKGROUND`, `TEXT_PRIMARY`, `TEXT_MUTED`, `DANGER`, `WARNING`, `SUCCESS`.
- `src/constants/config.ts` — `DEFAULT_REMINDER_HOUR = 21`, `DEFAULT_CURRENCY = "FCFA"`.

### 4. Primitives (RED → GREEN)
1. **RED:** `src/components/__tests__/primitives.test.tsx` — six renders + Button.onPress fires + ProgressBar clamps `[0,100]`.
2. **GREEN:** `Button.tsx`, `Typography.tsx`, `TextInput.tsx`, `Card.tsx`, `Modal.tsx`, `ProgressBar.tsx` in `src/components/`.

### 5. Routing skeleton
- `src/app/_layout.tsx` — root `<Stack screenOptions={{ headerShown: false }}>`.
- `src/app/index.tsx` — `<Redirect href="/(tabs)/dashboard" />`.
- `src/app/(tabs)/_layout.tsx` — `<Tabs>` with five `<Tabs.Screen>` entries.
- `src/app/(tabs)/{dashboard,transactions,budget,projects,reports}.tsx` — placeholder `<View />`.

### 6. Empty feature directories
- `.gitkeep` under `src/features/finance/{auth,income,expenses,budget,funds,projects,debt,reports,dashboard}/`.

### 7. Notifications skeleton
- `src/notifications/notifications.service.ts` — `scheduleNotification`, `cancelNotification` stubs throwing `NotImplementedError`.
- `src/notifications/notifications.types.ts` — `NotificationType`, `NotificationPayload`.

### 8. Acceptance verification
- `npm test` — all tests green.
- `/check-arch` logic on the diff.
- `code-reviewer` subagent on the branch diff.
- Mark VS-01 → `✅ Done` in `docs/KANBAN.md`.

## Design decisions (alternatives rejected)

1. **Strip the Expo demo template** rather than keep dead components. Rejected alt: leave them as ignored. CLAUDE.md root forbids orphaned/half-finished code.
2. **Migration runner takes an injected `SqliteDriver`**, tests use `better-sqlite3`, runtime uses `expo-sqlite`. Rejected alt: mock `expo-sqlite` — CLAUDE.md forbids mocking SQLite in service tests.
3. **`expo-sqlite` + `expo-notifications` installed via `npx expo install`** so the SDK pin matches `expo@~55.0.26` (AGENTS.md mandate).
4. **Use standard `<Tabs>` from `expo-router`**, not the experimental `unstable-native-tabs` currently in `AppTabs`. Stability for the acceptance check.
5. **`_migrations` schema:** `(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, applied_at TEXT NOT NULL)`. ISO 8601 per `services/CLAUDE.md`.
6. **`Modal.tsx` wraps React Native's built-in `<Modal>`** as a typed pass-through; VS-02/VS-12 will extend if needed.
7. **No `TabBar.tsx`, `Badge.tsx`, `EmptyState.tsx`, `ConfirmDialog.tsx` yet** — KANBAN VS-01 names only the six primitives; the rest ship with their first consumer slice.
