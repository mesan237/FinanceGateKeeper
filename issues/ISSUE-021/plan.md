# ISSUE-021 — Profile & PIN Auth (VS-02 + VS-22)

## Goal
Ship the deferred local PIN gate (VS-02) and a new local profile (VS-22 — display
name + on-device avatar). Both live in the existing `auth` slice, which already
owns the single-row `users` table, so no new cross-feature edge is introduced.
`users` is excluded from cloud sync → PIN and profile stay device-local by design.

## Decisions
- **Avatar:** initials/emoji on a pickable palette color — no photo upload (no
  expo-image-picker, no Supabase Storage).
- **PIN hashing:** `expo-crypto` SHA-256 over a per-install random salt + PIN,
  deterministically mocked in `jest.setup.ts`.
- **Cooldown:** 3 wrong entries → 30s, held in memory in `AuthProvider` (resets
  on relaunch; no migration for attempt counters).
- **Profile home:** the `auth` slice (owns the `users` row) — not a new slice —
  so there is no `profile → auth` cross-feature edge.

## What was built
- **Migration 024** — adds `pin_salt`, `display_name`, `avatar_color`,
  `avatar_emoji` to `users` (`pin_hash` already existed from 008).
- **`utils/pinHash.ts`** — `generateSalt`, `hashPin`.
- **`auth.service.ts`** — `hasPin/setPin/verifyPin/changePin/clearPin`; exported
  `getOrCreateUserRow`.
- **`auth.profile.ts`** — `getProfile/setProfile` (partial patch).
- **`auth.hooks.ts`** — `useProfile`.
- **`AuthProvider.tsx` / `useAuthLock`** — lock state machine + cooldown.
- **`PinKeypad.tsx`, `AuthScreen.tsx`, `ChangePinScreen.tsx`**.
- **`ProfileAvatar.tsx`, `ProfileScreen.tsx`** + **`CloudAccountCard.tsx`**
  (cloud sign-in/out extracted from `SettingsScreen` and shared via `testIDPrefix`).
- **`AuthGate`** in `app/_layout.tsx` — hard-gates the route tree.
- **Routes** — `app/profile/index.tsx`, `app/profile/change-pin.tsx`; Profile link
  added atop `SettingsScreen`.
- **Forgot-PIN recovery** — `PinRecoveryScreen.tsx` (opened from a "Forgot PIN?"
  link on the unlock screen): cloud-password re-auth → `AuthProvider.resetPin`
  (clear PIN → setup), no data loss; no-cloud fallback → `services/database`
  `resetLocalData` (drop all tables + re-migrate to fresh install) behind a
  confirm step. `clearPin` already existed in `auth.service`.

## Verification
- `npx jest` — 828/829 (the 1 failure is the documented flaky auth CHECK test;
  passes in isolation). 41 new PIN/profile/recovery tests.
- `tsc` — profile/auth files clean. Pre-existing, out-of-scope tsc errors remain
  (stale `/(tabs)/...` route literals in app/index, AllocationScreen,
  ExpenseLogScreen, ProjectDetail, ProjectForm — surfaced by router-type regen;
  groups don't affect runtime URLs — plus 4 pre-existing test-file type errors).
- `/check-arch` — PASS (no new cross-feature edges).
- Manual: fresh install → forced PIN setup; relaunch → unlock; 3 wrong → 30s
  cooldown; Settings → Profile edits name/color/emoji and persists; Change PIN works.
