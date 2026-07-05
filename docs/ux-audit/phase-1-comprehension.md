# Phase 1 — Comprehension

**Goal:** make the app legible to a first-time user. Teach the mental model,
reveal the core feature, and make the pivotal allocation moment forgiving.
**Why first:** every later phase assumes the user understands buckets and modes.

Ordered high → low: **H1 → H3 → H4 → M7**.

---

## H1 — No onboarding; the core mental model is never explained  · Priority: HIGH · Essential

**Current behavior**
After PIN setup ([`AuthScreen.tsx`](../../src/features/finance/auth/AuthScreen.tsx))
the app redirects straight to `/dashboard`
([`src/app/index.tsx`](../../src/app/index.tsx)). The only guidance is one dashed
card ([`DashboardScreen.tsx:112-122`](../../src/features/finance/dashboard/DashboardScreen.tsx#L112))
that references three undefined concepts: "Control mode", "allocation", "unlocks".

**Why it's a problem**
Domain jargon (*allocation, buckets, Hold for later, Unallocated pool, Zero Day,
Learning/Control mode*) has no in-context definition. The user cannot form a
model of what the app wants them to do → early churn.

**Proposed change**
Add a skippable 3–4 screen first-run carousel shown once, immediately after the
*first* PIN setup (not on every unlock):
1. "Log every income & expense" — the daily habit.
2. "We split each income into buckets automatically" — Emergency / Savings /
   Projects / Expenses, with a simple visual.
3. "Start in Learning mode; switch to Control when ready" — set expectations for
   the hidden budget tab.
4. (Optional) "Set your daily reminder" — soft CTA into notifications.

**Implementation notes**
- New flag on the users row, e.g. `onboarding_complete` (default 0), read in the
  auth layer alongside `pinState`. Gate the carousel in `AuthGate`
  ([`src/app/_layout.tsx:106`](../../src/app/_layout.tsx#L106)) so it renders
  after unlock but before the tabs, exactly once.
- New feature files under `src/features/finance/onboarding/` (Screen + hook +
  service to read/set the flag) to respect the slice architecture; the routing
  layer decides when to show it.
- Keep every screen skippable ("Skip" always visible). Persist completion on
  finish *or* skip.

**Acceptance**
- Fresh install: PIN setup → carousel → dashboard.
- Second launch: PIN unlock → dashboard (no carousel).
- "Skip" on screen 1 still marks onboarding complete.

---

## H3 — Core feature hidden by default; unlock is undiscoverable · Priority: HIGH · Essential

**Current behavior**
Default mode is `learning`
([`AppModeProvider.tsx:24`](../../src/features/finance/auth/AppModeProvider.tsx#L24));
the Budget tab is `href: null` in Learning mode
([`(tabs)/_layout.tsx:116`](../../src/app/(drawer)/(tabs)/_layout.tsx#L116)). The
only nudge to switch appears in **Settings** after 30 days
([`SettingsScreen.tsx:110`](../../src/features/finance/auth/SettingsScreen.tsx#L110)) —
a screen buried in the drawer.

**Why it's a problem**
The product's differentiator is invisible and the path to reveal it depends on
stumbling into Settings a month later. Value discovery is near zero.

**Proposed change**
1. Introduce the mode explicitly during onboarding (H1, screen 3).
2. Promote the Learning→Control nudge onto the **Dashboard** Getting-Started card
   once the user has logged a few transactions (e.g. ≥ 3 or after N days),
   instead of only in Settings. Tapping it deep-links to the mode toggle or flips
   it inline with a confirmation.
3. Keep the existing Settings toggle as the permanent home.

**Implementation notes**
- The dashboard already receives `includeBudgetData` at the routing layer
  ([`dashboard.tsx`] passes `mode === 'control'`). Pass a second prop (e.g.
  `showControlNudge`) computed from mode + a "has logged enough" signal so the
  feature stays free of the auth import (mirrors the existing gating precedent).
- Reuse the copy/logic already in `SettingsScreen` (`monthOneComplete`) but lower
  the threshold for the dashboard nudge so it lands while interest is high.

**Acceptance**
- Learning-mode user who has logged a few transactions sees a "Ready for
  budgeting? Switch to Control mode" prompt on the dashboard.
- Prompt disappears once in Control mode.

---

## H4 — Allocation confirm screen can't edit the split yet locks the month · Priority: HIGH · Essential

**Current behavior**
Logging income routes to `AllocationScreen`, which shows a **default 10/10/15/65**
split auto-seeded by `getOrCreateCurrentAllocation`
([`budget.hooks.ts:36`](../../src/features/finance/budget/budget.hooks.ts#L36),
[`constants/allocation.ts:37`](../../src/constants/allocation.ts#L37)). The only
actions are **Confirm** / **Hold for later**; Confirm calls `onLock()` and locks
the month ([`AllocationScreen.tsx:120`](../../src/features/finance/budget/AllocationScreen.tsx#L120)).
Editing percentages lives on a separate screen (`/budget/settings`) reachable only
from the Budget tab, with **no link from the allocation screen**.

**Why it's a problem**
A first-time Control-mode user is shown a split they never chose, cannot adjust it
in the moment, and Confirm silently locks it for the whole month. The later
"Locked for this month" banner
([`BudgetOverview.tsx:98`](../../src/features/finance/budget/BudgetOverview.tsx#L98))
then reads as punitive.

**Proposed change**
1. Add an **"Adjust split"** link on `AllocationScreen` that opens
   `AllocationSettings` (`/budget/settings`) and returns to the breakdown.
2. On the *first ever* allocation for the account, route the user to set
   percentages **before** presenting a breakdown, rather than presenting seeded
   defaults as a fait accompli.
3. Make the lock consequence explicit **before** Confirm — e.g. change the button
   to a confirm dialog or add helper text: "Confirming locks this split until next
   month." (Today the only lock messaging is *after* the fact.)

**Implementation notes**
- `AllocationScreen` already imports the router; add a secondary link/button
  near the Confirm/Hold pair. Refresh the breakdown on return (the allocation
  hook already exposes `refresh`).
- Detect "first ever allocation" via the allocation row's freshly-created state
  (no locked history) — the service already distinguishes create vs update.
- Keep "Hold for later" as-is; it's the good escape hatch.

**Acceptance**
- From the allocation screen the user can open settings, change percentages, and
  come back to an updated breakdown without losing the in-flight income.
- Confirm shows the lock consequence before committing.
- First-ever allocation prompts for percentages instead of defaulting silently.

---

## M7 — "Zero Day" is unexplained jargon on the primary surface · Priority: MEDIUM · Recommended

**Current behavior**
The Dashboard action bar shows a **"Zero Day"** button that one-tap confirms
([`QuickActionBar.tsx:73`](../../src/features/finance/dashboard/QuickActionBar.tsx#L73)).

**Why it's a problem**
No first-time user knows what "Zero Day" means; it's a prominent CTA that is
incomprehensible on first contact.

**Proposed change**
Rename to something self-describing — e.g. **"I spent nothing today"** — or keep
the short label but add a one-line explainer/tooltip the first time it appears.
Rationale: the button's meaning should not require prior product knowledge.

**Implementation notes**
- Label lives in `QuickActionBar`; the concept is also referenced by
  `ZeroDayGate` / the daily reminder — align copy across both so the notification
  and the button use the same wording.

**Acceptance**
- The action's purpose is clear without external explanation.
