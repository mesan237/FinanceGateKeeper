# ISSUE-023 — First-Run Onboarding Carousel

**Maps to:** KANBAN VS-23
**Priority:** High
**Blocked by:** VS-02 (PIN Auth ✅), VS-08 (App mode / `users` row ✅)
**Audit ref:** H1 (`docs/ux-audit/phase-1-comprehension.md`)

---

## Problem Statement

After PIN setup the app redirects straight to `/dashboard`
(`src/app/index.tsx`). The two concepts that define the product — **allocation
buckets** and **Learning vs Control mode** — are never introduced, and the
headline feature (budgeting) is hidden by default in Learning mode. A first-time
user cannot form a model of what the app wants them to do. The only guidance is a
single dashed card on the dashboard that itself references three undefined terms
("Control mode", "allocation", "unlocks").

This slice adds a one-time, skippable first-run carousel that teaches the model
before the user reaches the tabs.

Two constraints shape the design:

- **Show once, after the first unlock.** The carousel must render after the PIN
  gate resolves `unlocked` and before the tabs mount, exactly once per install —
  not on every launch.
- **Gating lives at the routing layer**, never via feature→feature imports
  (mirrors VS-08 Design Decision #2). The onboarding feature owns its screen and
  a settings read/write; the root layout decides *when* to show it.

## User Stories

- **As a new user,** the first time I open the app after creating my PIN, I see a
  short intro that explains I log income & expenses, that each income is split
  into buckets automatically, and that I start in Learning mode and can switch to
  Control mode later.
- **As a new user,** I can **Skip** the intro at any point and still land on the
  dashboard; it does not reappear next launch.
- **As a returning user,** I never see the carousel again.

## Scope

Implementation order is top-to-bottom (tests precede implementation per TDD).

### Database

- `src/services/migrations/025_add_onboarding_complete.ts` — **new**. `ALTER
  TABLE users ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0`.
  `down` drops the column (matching the project's migration convention).
- `src/services/migrations/index.ts` — **modified** to register migration 025.

### Types

- `src/features/finance/auth/auth.types.ts` — **modified**: add
  `onboardingComplete: boolean` to `AppSettings`.

### Auth service / hooks

- `src/features/finance/auth/auth.service.ts` — **modified**:
  - Add `onboarding_complete` to the `USER_COLUMNS` SELECT list (currently the
    fixed string at `auth.service.ts:21`) and to the `UserRow` type.
  - Map it in the row→`AppSettings` transform (`onboardingComplete: row.onboarding_complete === 1`).
  - `getOnboardingComplete(): Promise<boolean>` and
    `setOnboardingComplete(value: boolean): Promise<void>` (UPDATE the single
    `users` row, mirroring `setAppMode`).
- `src/features/finance/auth/auth.hooks.ts` — **modified**: extend `useAppSettings`
  (or add `useOnboarding()`) to expose `onboardingComplete` + a
  `completeOnboarding()` mutator that persists `true` and refreshes.

### Onboarding feature — `src/features/finance/onboarding/` (new slice)

- `OnboardingScreen.tsx` — **new**. A horizontally-paged carousel of 3–4 panels
  built from the shared primitives (`Typography`, `Button`), themed. Panels:
  1. "Log everything" — record each income & expense; that's the daily habit.
  2. "We split each income automatically" — Emergency / Savings / Projects /
     Expenses, with a simple visual (reuse `BUCKET_LABELS` from
     `constants/allocation`).
  3. "Start in Learning mode" — logging only; Control mode unlocks budgeting when
     you're ready.
  4. (optional) "Set a daily reminder" — soft CTA; deep-link into Settings later.
  A persistent **Skip** control and a **Next / Get started** button. Calls
  `onDone` on finish **or** skip. No feature imports beyond `components/`,
  `constants/`, and its own hook.
- `onboarding.hooks.ts` — **new**: thin wrapper over the auth mutator if the
  screen needs local paging state helpers. (Paging state itself is local
  `useState`.)

> Architectural note: the onboarding screen reads/writes the onboarding flag
> through the **auth** feature. `onboarding → auth` is a new cross-feature edge —
> add it to the approved list in `docs/ARCHITECTURE.md` (see Design Decision #2),
> or, to avoid a new edge, have the root layout pass the flag + `completeOnboarding`
> down as props (mirrors how VS-08 injects reminder props into `ZeroDayGate`).
> **Preferred: props injection**, no new edge.

### Routes / Layout

- `src/app/_layout.tsx` — **modified**. Add an `OnboardingGate` inside the
  unlocked branch of `AuthGate`, wrapping the app tree (above `AppModeProvider`).
  It reads `onboardingComplete` (via `useAppSettings`, already called at
  `RootLayout` top — pass down as a prop) and:
  - while the settings load → render `null` (no flash, mirrors `AuthGate`),
  - when incomplete → render `<OnboardingScreen onDone={…} />` inside `ThemedShell`,
  - when complete → render `children`.
  On `onDone`, persist via `completeOnboarding()` and fall through to the app.

## TDD Anchors

Failing tests first; the slice is done when they all pass.

1. **`migrations` / `auth.service.test.ts`** (extended):
   - After migration 025, `getAppSettings()` on a fresh row returns
     `onboardingComplete: false`.
   - `setOnboardingComplete(true)` persists and survives a re-read;
     `getOnboardingComplete()` returns `true`.
2. **`OnboardingScreen.test.tsx`**:
   - Renders the first panel; **Next** advances through panels; the final panel's
     CTA fires `onDone`.
   - **Skip** on panel 1 fires `onDone` (completion on skip).
3. **Gate behavior** (`_layout` or an extracted `OnboardingGate.test.tsx`):
   - Renders the carousel when `onboardingComplete` is false and children when
     true; renders `null` while loading.

## Acceptance Check (Done When)

- Fresh install: PIN setup → carousel → dashboard.
- Second launch: PIN unlock → dashboard (no carousel).
- **Skip** on any panel still marks onboarding complete and does not reappear.
- `npm test`, `tsc`, and `/check-arch` are clean.

## Design Decisions

> **⚠️ One decision needs sign-off at the approval checkpoint (cross-feature edge).**

- **(1) Onboarding completion is a boolean column on `users`, not a separate
  table.** It's a single app-scoped flag alongside `app_mode` — same rationale as
  the existing settings columns. *Rejected alt:* a KV settings table (contradicts
  the existing `users`-row pattern, adds a migration for one bit).
- **(2) The gate injects the flag + mutator as props from the root layout rather
  than adding an `onboarding → auth` import.** Preserves the "no feature→feature
  imports for gating" rule that VS-08 established. *Rejected alt:* approve a new
  `onboarding → auth` edge in `docs/ARCHITECTURE.md` — heavier and unnecessary
  since `app/` may already read `useAppSettings`.
- **Carousel, not modal stack.** A single paged screen is lighter than N routes
  and keeps Skip/Next state trivial. *Rejected alt:* one Expo route per panel —
  more routing surface for a once-ever flow.
- **Show after unlock, before tabs.** Placed inside `AuthGate`'s unlocked branch
  so a locked or unset app never flashes onboarding, matching the existing gate
  ordering.

## Out of Scope (Deferred)

- Re-triggering onboarding from Settings ("replay intro") — a later nicety.
- Localization of onboarding copy — single hard-coded FCFA-context string set.
- Interactive tutorial / coach-marks over live screens — this is static intro
  panels only.

## After This Slice

1. `/check-arch` — confirm no feature→feature import was introduced (onboarding
   stays gated at the routing layer via props).
2. Invoke the `code-reviewer` subagent on the branch diff; address `BLOCK` findings.
3. Mark VS-23 `✅ Done` in `docs/KANBAN.md` with the test count and migration 025.
4. Delete `issues/ISSUE-023/` after on-device verification.
