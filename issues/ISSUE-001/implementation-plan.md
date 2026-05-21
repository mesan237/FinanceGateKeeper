# ISSUE-001 — Project Scaffold & Core Infrastructure

**Maps to:** KANBAN VS-01
**Priority:** Critical — every other slice depends on this.
**Blocked by:** Nothing.

---

## Problem Statement

The repository currently has only docs and a default Expo `reset-project.js`. There is no app shell, no database, no tab bar, no shared UI primitives. Until those exist, no feature slice can be implemented because every later slice imports from them.

## User Stories

- **As the builder,** I can launch the Expo app and see a working bottom tab bar with all five tabs (Dashboard, Transactions, Budget, Projects, Reports) so I know the routing skeleton is in place.
- **As the builder,** I can run `npm test` and see the test runner execute against a real SQLite-backed migration so I know TDD infrastructure is ready.

## Scope

Each bullet below maps to a concrete file or set of files. Implementation order is top-to-bottom (tests precede implementation per TDD).

### Toolchain

- `tsconfig.json` — verify `@/*` already maps to `./src/*` (already present); no edit expected.
- `package.json` — add Jest, `jest-expo` preset, `@testing-library/react-native`, `@testing-library/jest-native`.
- `jest.config.js` — Expo preset, RNTL setup, `moduleNameMapper` aligned with the `@/` alias.
- `jest.setup.ts` — RNTL extensions registration.

### Database Layer

- `src/services/database.ts` — open a single SQLite connection via `expo-sqlite`, expose `getDb()`, run pending migrations on first access. Track applied migrations in `_migrations` table.
- `src/services/migrations/001_create_migrations_table.ts` — bootstrap `_migrations` table itself (id PRIMARY KEY, applied_at).
- `src/services/migrations/index.ts` — ordered registry array imported by `database.ts`.
- `src/services/database.test.ts` — verify: connection opens, runner executes migrations in order, the same migration is not re-run on second open.

### Shared UI Primitives

Empty-but-typed implementations covering the cases VS-02+ will need:

- `src/components/Button.tsx`
- `src/components/Typography.tsx`
- `src/components/TextInput.tsx`
- `src/components/Card.tsx`
- `src/components/Modal.tsx`
- `src/components/ProgressBar.tsx`
- One smoke-test file `src/components/__tests__/primitives.test.tsx` rendering each.

### Constants

- `src/constants/colors.ts` — `PRIMARY_GREEN`, `BACKGROUND`, `TEXT_PRIMARY`, `TEXT_MUTED`, `DANGER`, `WARNING`, `SUCCESS`.
- `src/constants/config.ts` — `DEFAULT_REMINDER_HOUR = 21`, `DEFAULT_CURRENCY = "FCFA"`.

### Routing Skeleton

- `src/app/_layout.tsx` — root layout with navigation provider; placeholder for the PIN gate that VS-02 will add.
- `src/app/index.tsx` — redirect to `/(tabs)/dashboard`.
- `src/app/(tabs)/_layout.tsx` — bottom tab bar wiring the five tabs.
- `src/app/(tabs)/dashboard.tsx` — placeholder route (returns `<View />` until VS-13).
- `src/app/(tabs)/transactions.tsx` — placeholder route.
- `src/app/(tabs)/budget.tsx` — placeholder route.
- `src/app/(tabs)/projects.tsx` — placeholder route.
- `src/app/(tabs)/reports.tsx` — placeholder route.

### Empty Feature Directories

Create with a `.gitkeep` so subsequent slices have a home:

- `src/features/finance/{auth,income,expenses,budget,funds,projects,debt,reports,dashboard}/.gitkeep`

### Notifications Skeleton

- `src/notifications/notifications.service.ts` — stub `scheduleNotification`, `cancelNotification` that throw `NotImplementedError`. Real impl arrives in VS-08.
- `src/notifications/notifications.types.ts` — `NotificationType`, `NotificationPayload`.

## TDD Anchors

These are the failing tests to write first. Implementation is done when they all pass.

1. **Migration runner** — `src/services/database.test.ts`:
   - opens a connection cleanly,
   - executes pending migrations in numeric order,
   - records applied migrations in `_migrations`,
   - does not re-run a migration on a second `getDb()` call.

2. **SQLite lifecycle** — same file:
   - closing the database releases the lock so a subsequent open succeeds.

3. **Primitives smoke** — `src/components/__tests__/primitives.test.tsx`:
   - each of the six primitives renders without throwing,
   - `Button` invokes its `onPress` when fired,
   - `ProgressBar` clamps values to `[0, 100]`.

## Acceptance Check (Done When)

- `npx expo start` launches the app.
- The bottom tab bar renders with five labelled tabs.
- Tapping each tab swaps the visible placeholder screen without errors.
- `npm test` runs and every test above passes.
- `src/services/database.ts` creates `finance.db` and writes the `_migrations` row.

## Design Decisions (Locked During Grill Me)

- **SQLite over AsyncStorage.** Structured financial data with relational queries (joins between expenses ↔ categories ↔ allocations) warrants SQLite. AsyncStorage stays for tiny key/value config only (and is added when first needed, not now).
- **Migration registry is an explicit ordered array, not directory auto-discovery.** Avoids non-determinism on Windows vs. POSIX file-system orderings.
- **Path alias is `@/`, not `~/`.** Matches existing Expo Router community conventions and ARCHITECTURE.md.
- **Empty feature directories ship with `.gitkeep`.** Prevents Git from pruning them and gives later `/new-slice` runs a stable parent.

## Out of Scope (Deferred)

- PIN authentication → VS-02.
- Any feature business logic → VS-03+.
- Supabase client setup → VS-15.
- Chart library install → VS-14.

## After This Slice

Run `/check-arch` and the `code-reviewer` subagent. Then mark VS-01 as `✅ Done` in `docs/KANBAN.md` and delete this issue file (or move to `issues/done/`).
