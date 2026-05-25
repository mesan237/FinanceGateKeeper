# ISSUE-002 — PIN Authentication Gate

**Maps to:** KANBAN VS-02
**Priority:** High — unlocks VS-15 (Supabase sync) and gates all routes.
**Blocked by:** VS-01 (✅ Done).

---

## Problem Statement

Today the app launches straight into the `(tabs)` group with no authentication. Per the auth slice contract in `src/features/finance/auth/CLAUDE.md`, every launch after first-run must require a 4-digit PIN before tabs render. The slice also needs to store an `app_mode` (`learning` | `control`) that downstream slices (VS-08) will toggle from.

## User Stories

- **As the user, on first launch,** I see a "Create a PIN" screen, enter four digits, confirm them, and land on the dashboard.
- **As the user, on any later launch,** the app starts on a locked PIN screen; entering the correct PIN reveals the tabs.
- **As the user,** three wrong attempts in a row lock the keypad for 30 seconds before I can retry.

## Scope

### Toolchain
- `package.json` — add `expo-crypto` via `npx expo install expo-crypto` (SDK-pinned hashing primitive). No new devDeps.

### Database Layer
- `src/services/migrations/002_create_users_table.ts` — `CREATE TABLE users (id INTEGER PRIMARY KEY CHECK (id = 1), pin_hash TEXT NOT NULL, pin_salt TEXT NOT NULL, app_mode TEXT NOT NULL DEFAULT 'learning', created_at TEXT NOT NULL)`. Single-row table enforced by the `CHECK (id = 1)` constraint.
- `src/services/migrations/index.ts` — register the new migration in order.

### Auth Feature Slice (`src/features/finance/auth/`)
- `auth.types.ts` — `AppMode = 'learning' | 'control'`, `User`, `AuthState`, `AuthContextValue`.
- `auth.service.ts` — pure service. Exports:
  - `hashPin(pin, salt, hasher): Promise<string>` — testable seam.
  - `setPin(pin)` — generates random salt via `expo-crypto.getRandomBytesAsync`, hashes, `INSERT OR REPLACE` into `users (id=1, ...)`.
  - `verifyPin(pin): Promise<boolean>` — loads row, recomputes hash with stored salt, compares.
  - `hasPin(): Promise<boolean>` — true iff users row exists.
  - `getAppMode(): Promise<AppMode>` / `setAppMode(mode)`.
  - `createExpoCryptoHasher()` (default, lazy-imports `expo-crypto.digestStringAsync`) and `createNodeHasher()` (for tests, uses `node:crypto.createHash`).
- `auth.hooks.ts` —
  - `AuthProvider` React context: on mount, calls `hasPin()` and `getAppMode()` once.
  - `useAuth()` returns `{ isReady, hasPin, isLocked, unlock(pin), setupPin(pin), lock(), failedAttempts, cooldownUntilMs, appMode }`.
  - Failure tracking + cooldown lives inside the provider so it survives screen remounts.
- `AuthScreen.tsx` — renders one of two states based on `hasPin`:
  - **Setup:** "Create a PIN" → first 4-digit entry → "Confirm PIN" → second entry must match → `setupPin()`.
  - **Unlock:** "Enter your PIN" → 4-digit entry → `unlock()`. Wrong attempt shows inline error and clears entry. After 3 wrong attempts in a row, render disabled keypad + countdown until `cooldownUntilMs`.
- `Keypad.tsx` (slice-private) — 3×4 numeric grid (`1-9`, blank, `0`, `⌫`) using `Button` from `@/components`. Emits each digit and a backspace event.

### Routing Skeleton
- `src/app/_layout.tsx` — wrap `<Slot />` in `<AuthProvider>`. Keep the root layout free of guard logic.
- `src/app/(auth)/_layout.tsx` — `<Stack screenOptions={{ headerShown: false }}>`. If `!isLocked && isReady`, `<Redirect href="/(tabs)/dashboard" />`.
- `src/app/(auth)/pin.tsx` — thin route rendering `<AuthScreen />`.
- `src/app/(tabs)/_layout.tsx` — if `isReady && isLocked`, `<Redirect href="/(auth)/pin" />`. Otherwise keep the existing `<Tabs>` config.
- `src/app/index.tsx` — unchanged; redirect target's layout will gate.

While `isReady === false`, layouts render `null` so we never flash the wrong screen during the initial DB read.

## TDD Anchors

Failing tests are written first. The slice is Done when they all pass.

### 1. `src/features/finance/auth/__tests__/auth.service.test.ts`
- `hashPin` is deterministic: same `(pin, salt)` → same hash.
- `hashPin` salt-sensitive: different salt → different hash.
- `setPin` then `verifyPin('correct')` → `true`; `verifyPin('wrong')` → `false`.
- `hasPin()` false before `setPin`, true after.
- `setPin` called twice replaces the hash (row count stays at 1).
- `getAppMode()` defaults to `'learning'`; `setAppMode('control')` persists.

The test file boots a fresh `better-sqlite3` in-memory DB per test, runs both migrations through `runMigrations`, and injects a `createNodeHasher()` so no `expo-crypto` mock is needed. Services accept the driver via dependency injection (mirrors `database.test.ts`).

### 2. `src/features/finance/auth/__tests__/auth.hooks.test.tsx`
- Initial render with no PIN: after `isReady`, `{ hasPin: false, isLocked: false }`.
- Initial render with PIN seeded in the DB: after `isReady`, `{ hasPin: true, isLocked: true }`.
- `unlock('wrong')` increments `failedAttempts`; on the 3rd wrong attempt `cooldownUntilMs > Date.now()`.
- `unlock('correct')` flips `isLocked → false` and resets `failedAttempts` to 0.
- `setupPin('1234')` flips `hasPin → true` and `isLocked → false`.

### 3. `src/features/finance/auth/__tests__/AuthScreen.test.tsx`
- With no PIN: renders "Create a PIN", typing 4 digits advances to confirm step.
- With PIN: renders "Enter your PIN", typing the correct PIN calls the supplied `onUnlock` (or causes the screen to re-render unlocked — whichever the hook surface allows mock-injection cleanest).
- Wrong PIN shows an inline error and clears the entry buffer.
- After cooldown trigger, the keypad disables and shows the countdown.

The screen test injects a stub `useAuth` via React context so it never touches SQLite.

## Acceptance Check (Done When)
- `npm test` passes (existing 14 + new tests).
- `npx expo start` on a fresh DB opens to the PIN setup screen, confirms a PIN, and lands on dashboard.
- Killing and relaunching opens to the locked PIN screen and only the correct PIN reveals the tabs.
- 3 wrong PIN entries disable the keypad for 30 seconds.
- `/check-arch` passes (no forbidden imports introduced).
- VS-02 marked `✅ Done` in `docs/KANBAN.md`.

## Design Decisions (alternatives rejected)

1. **SHA-256 via `expo-crypto.digestStringAsync` with a per-user random salt** rather than bcrypt/argon2. The auth `CLAUDE.md` explicitly calls for a "simple hash — not bcrypt, this is local-only security." Random salt still beats a constant pepper at no real cost.
2. **`Hasher` dependency injection** in `auth.service.ts`, identical pattern to `SqliteDriver` in `database.ts`. Tests use `node:crypto`; runtime uses `expo-crypto`. Rejected alt: mocking `expo-crypto` in jest config — needless coupling and CLAUDE.md disallows mocking core data primitives.
3. **`users` table enforced single-row via `CHECK (id = 1)`** instead of a UNIQUE constraint or app-layer check. The product is single-user (PRD); the DB should make multi-user state impossible by construction.
4. **Auth state lives in a React context provider** wrapped at the root layout, not in module-scoped state. The auth `CLAUDE.md` explicitly mandates context. Failed-attempt counter and cooldown live in the same provider so they survive screen unmount/remount.
5. **Route gates live in `(auth)/_layout.tsx` and `(tabs)/_layout.tsx`** using `<Redirect>` based on `useAuth().isLocked`. Rejected alt: `Stack.Protected` — newer Expo Router API, not certified on 55. Rejected alt: gating only in the root `_layout.tsx` — Expo Router can't conditionally mount route groups from above without remounting on every state change, which causes the keypad to flicker.
6. **Render `null` until `isReady`** — prevents an unauthenticated tab flash before the initial `hasPin()` query resolves. Acceptable because the initial read is sub-frame on SQLite.
7. **`Keypad.tsx` lives inside the auth slice**, not in `src/components/`. Per slice rules: domain-specific UI stays in its feature folder; no other slice needs a numeric keypad in VS-03..VS-15.
8. **`app_mode` column ships now** even though only VS-08 reads it. Adding it later means a second migration plus an `ALTER TABLE`, while shipping it now costs one extra column the rest of VS-02 doesn't touch.

## Out of Scope (Deferred)
- Switching app mode UI / month-1 prompt → VS-08.
- Biometric unlock → not in PRD.
- PIN-reset / forgot-PIN flow → not in PRD (cold reinstall is the recovery path).
- Auto-lock-on-background timer → not requested by the slice.

## After This Slice
- Run `/check-arch` and the `code-reviewer` subagent on the branch diff.
- Mark VS-02 `✅ Done` in `docs/KANBAN.md`.
