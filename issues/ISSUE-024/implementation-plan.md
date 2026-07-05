# ISSUE-024 — Dashboard Comprehension: Control-Mode Nudge & Clearer Labels

**Maps to:** KANBAN VS-24
**Priority:** High
**Blocked by:** VS-08 (App mode ✅), VS-13 (Dashboard ✅), VS-23 (Onboarding)
**Audit refs:** H3, M7 (`docs/ux-audit/phase-1-comprehension.md`)

---

## Problem Statement

Two comprehension gaps live on the app's home screen:

1. **H3 — the core feature is hidden and its unlock is undiscoverable.** Default
   mode is `learning` (`AppModeProvider.tsx:24`); the Budget tab is `href: null`
   in Learning mode (`(tabs)/_layout.tsx:116`). The only nudge to switch appears
   in **Settings** after 30 days (`SettingsScreen.tsx:110`) — a screen the user
   has no reason to open. So the product's differentiator can go undiscovered.
2. **M7 — "Zero Day" is unexplained jargon** on a prominent Dashboard action
   (`QuickActionBar.tsx:73`). A first-time user cannot know what it means.

## User Stories

- **As a Learning-mode user** who has logged a few transactions, I see a prompt on
  the dashboard inviting me to switch to Control mode, with a one-line reason —
  and switching is one tap (with confirmation).
- **As any user,** the "spent nothing today" action reads plainly instead of using
  the term "Zero Day."

## Scope

### H3 — Dashboard Control-mode nudge

- `src/app/(drawer)/(tabs)/dashboard.tsx` — **modified**. The route already reads
  `useAppMode()` and passes `includeBudgetData={mode === 'control'}`. Compute and
  pass a second prop, e.g. `showControlNudge`, so the dashboard feature keeps its
  no-auth-import rule (routing-layer gating, per VS-08 decision #2). The "logged
  enough" signal (≥ N transactions or ≥ N days since `created_at`) is derived at
  the routing layer from `useAppSettings` / a small count read — **not** inside
  the dashboard feature.
- `src/features/finance/dashboard/DashboardScreen.tsx` — **modified**. When
  `showControlNudge` is true, render a call-to-action inside (or replacing) the
  existing learning-mode "Getting started" card (`DashboardScreen.tsx:112`):
  "Ready for budgeting? Switch to Control mode." with an action.
- Switch mechanism (pick one, see Design Decision #1):
  - **(preferred)** the action deep-links to Settings' mode toggle
    (`router.push('/settings')`) — zero new cross-feature surface; or
  - the action flips the mode inline via a prop callback the route wires to
    `setMode('control')` + `refresh()` (the route may call auth hooks).

### M7 — Clearer zero-day label

- `src/features/finance/dashboard/QuickActionBar.tsx` — **modified**. Change the
  action label from "Zero Day" to self-describing copy, e.g. **"No spending"** /
  **"I spent nothing today"** (keep it short enough for the 3-button bar).
- Align the wording in the zero-day notification / `ZeroDayGate` prompt copy
  (`notifications.config.ts` messages and `ZeroDayPrompt`) so the button and the
  reminder speak the same language. Behavior is unchanged — copy only.

## TDD Anchors

1. **`dashboard.tsx` / `DashboardScreen.test.tsx`**:
   - Renders the Control-mode nudge when mode = learning AND the "logged enough"
     signal is true; hidden when the signal is false and hidden in control mode.
   - Tapping the nudge invokes the switch/navigation callback.
2. **`QuickActionBar.test.tsx`**:
   - Renders the new label (not "Zero Day"); the action still calls
     `onConfirmZeroDay`.
3. **Copy alignment** (light): the zero-day notification/prompt uses the new
   wording (assert the config string).

## Acceptance Check (Done When)

- A Learning-mode user with a few logged entries sees a clear switch-to-Control
  prompt on the dashboard; it disappears once in Control mode.
- The former "Zero Day" action reads plainly and still records a zero-day.
- `npm test`, `tsc`, and `/check-arch` are clean.

## Design Decisions

- **(1) The nudge deep-links to the Settings mode toggle rather than flipping mode
  inline.** Keeps the switch in one canonical place and avoids widening what the
  dashboard route wires up. *Rejected alt:* inline flip on the dashboard — faster
  for the user but duplicates the switch logic; revisit if the extra tap tests
  poorly. **Confirm your preference at the checkpoint.**
- **(2) The "logged enough" threshold is derived at the routing layer**, not in
  the dashboard feature, preserving the VS-08 gating rule. Threshold default: ≥ 3
  transactions OR ≥ 7 days since `created_at` (tune during review).
- **M7 is copy-only.** No behavior change to zero-day recording; only the label
  and the matching notification string move together so they don't drift.

## Out of Scope (Deferred)

- Reworking the Settings mode card itself (its 30-day suggestion stays as the
  permanent home for the toggle).
- A full "what is Control mode?" explainer screen — the onboarding carousel
  (VS-22) covers first-run education; this slice is the in-context nudge.

## After This Slice

1. `/check-arch` — confirm the dashboard feature still imports no other feature
   (nudge gating stays at the route).
2. `code-reviewer` subagent on the diff; address `BLOCK` findings.
3. Mark VS-24 `✅ Done` in `docs/KANBAN.md` with the test count.
4. Delete `issues/ISSUE-024/` after on-device verification.
