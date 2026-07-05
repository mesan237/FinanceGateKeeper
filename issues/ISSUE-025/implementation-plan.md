# ISSUE-025 — Forgiving Allocation: Editable Split & Pre-Lock Warning

**Maps to:** KANBAN VS-25
**Priority:** High
**Blocked by:** VS-06 (Budget Allocation ✅), VS-19 (Deferred Income Allocation ✅)
**Audit ref:** H4 (`docs/ux-audit/phase-1-comprehension.md`)

---

## Problem Statement

The allocation confirm screen is the make-or-break moment of the core feature, and
it is the least forgiving screen in the app:

- Logging income routes to `AllocationScreen`, which shows a **default 10/10/15/65**
  split auto-seeded by `getOrCreateCurrentAllocation`
  (`budget.hooks.ts:36`, `constants/allocation.ts:37`).
- The only actions are **Confirm** / **Hold for later**; there is no way to adjust
  the split in the moment. Editing percentages lives on a *separate* screen
  (`/budget/settings` → `AllocationSettings`) reachable only from the Budget tab,
  with **no link from the allocation screen**.
- **Confirm calls `onLock()` and locks the month** (`AllocationScreen.tsx:120`).
  The lock is only disclosed *after the fact* via the "Locked for this month"
  banner (`BudgetOverview.tsx:98`), so a first-time user unknowingly commits a
  split they never chose and freezes it for the month.

This slice makes the flow editable and the lock consequence explicit — without a
schema change or new cross-feature edges (`budget → funds/projects/income` are
already approved).

## User Stories

- **As a user allocating income,** I can tap "Adjust split" to change the
  percentages and return to an updated breakdown without losing the income I just
  logged.
- **As a first-time Control-mode user,** the very first allocation asks me to set
  my percentages *before* showing a breakdown, instead of presenting defaults as
  final.
- **As a user about to Confirm,** I'm told that confirming locks the split until
  next month *before* I commit, not only afterward.

## Scope

### UI — `src/features/finance/budget/`

- `AllocationScreen.tsx` — **modified**:
  - Add an **"Adjust split"** secondary link/button (near the Confirm / Hold pair)
    that navigates to `/budget/settings` (`AllocationSettings`) for the same
    `monthISO`. On return, re-read the allocation so the breakdown reflects edits
    — the `useAllocation` hook already exposes `refresh` (`budget.hooks.ts:33`);
    call it on focus (e.g. `useFocusEffect`) so returning from settings
    recomputes `calculateBreakdown`.
  - **First-ever allocation:** when the allocation row was just created and has
    never been locked (a fresh, default-seeded row), route the user to
    `AllocationSettings` to set percentages **before** presenting a breakdown,
    rather than showing the seeded default as final. Detect via a flag the service
    already distinguishes (create vs fetch) — see Design Decision #1.
  - **Pre-Confirm lock disclosure:** before `handleConfirm` locks the month,
    surface the consequence — either inline helper text under the Confirm button
    ("Confirming locks this split until next month") **and/or** a confirm dialog
    on first Confirm. Keep the existing `handleHold` path unchanged.
- `AllocationSettings.tsx` — **no functional change**; it already validates the
  100% sum and disables Save until `total === 100` (`AllocationSettings.tsx:104`).
  Confirm it returns cleanly to the allocation screen (it uses `ScreenHeader` →
  `router.back()`).

### Service / hooks (only if needed for first-run detection)

- `budget.service.ts` / `budget.hooks.ts` — **modified only if** the "was this row
  just created?" signal isn't already surfaced. `getOrCreateCurrentAllocation`
  knows whether it inserted vs read; expose that (e.g. return `{ allocation,
  createdNow }` or a separate `hasConfiguredAllocation(monthISO)`), consumed by
  `AllocationScreen` to decide the first-ever redirect. No schema change.

## TDD Anchors

1. **`AllocationScreen.test.tsx`**:
   - Renders an "Adjust split" control that navigates to `/budget/settings` with
     the correct `monthISO`.
   - After returning (simulated focus/refresh), the breakdown reflects updated
     percentages.
   - A **first-ever** allocation (freshly created, never locked) redirects to
     settings before showing a breakdown; an existing/locked one shows the
     breakdown directly.
   - Confirm surfaces the lock disclosure before committing; the Hold path is
     unchanged and still leaves the income pending.
2. **`budget.service.test.ts`** (extended, only if the create-vs-read signal is
   added): `getOrCreateCurrentAllocation` reports `createdNow: true` on first call
   for a month and `false` on the second.

## Acceptance Check (Done When)

- From the allocation screen the user can open settings, change percentages, and
  return to an updated breakdown without losing the in-flight income.
- The first allocation prompts for percentages instead of defaulting silently.
- The month-lock consequence is disclosed before Confirm.
- `npm test`, `tsc`, and `/check-arch` are clean.

## Design Decisions

- **(1) First-ever allocation is detected via a create-vs-read signal from the
  service, not a new column.** `getOrCreateCurrentAllocation` already knows
  whether it inserted; surface that boolean rather than persisting "configured".
  *Rejected alt:* a new `is_configured` column — a migration for state the service
  already has.
- **(2) Editing stays in `AllocationSettings`; the allocation screen only links to
  it.** Avoids duplicating the percentage-editor (with its 100%-sum + priority
  reorder) in two places. *Rejected alt:* inline editing on the allocation screen
  — duplicates non-trivial validation UI.
- **(3) The lock remains one-way for the month** (this slice does not add an
  unlock/re-plan path — that's audit L6 / VS-30, a separate product decision). We
  only make the lock *visible before* Confirm, not reversible.

## Out of Scope (Deferred)

- Unlock / re-plan of a locked month → audit L6 (VS-30).
- Per-category budgets (already deferred per the budget CLAUDE.md).
- Changing the default percentages themselves — the fix is to let users edit and
  to disclose, not to re-tune the defaults.

## After This Slice

1. `/check-arch` — confirm no new cross-feature edges (budget → funds/projects/
   income already approved; no new imports added).
2. `code-reviewer` subagent on the diff; address `BLOCK` findings.
3. Mark VS-25 `✅ Done` in `docs/KANBAN.md` with the test count.
4. Delete `issues/ISSUE-025/` after on-device verification.
