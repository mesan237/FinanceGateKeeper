# Phase 4 — Refinements

**Goal:** ongoing quality-of-life and accessibility improvements. All optional —
schedule opportunistically once Phases 1–3 land.

Ordered high → low within the low bucket: **L3 → L1 → L5 → L4 → L2 → L6**.

---

## L3 — No undo on instant/quick actions · Priority: LOW · Optional (high value/cost ratio)

**Current behavior**
Quick-add logs an expense with one tap and no confirmation (by design). The
success toast ([`ExpenseEntryPanel.tsx:60`](../../src/features/finance/expenses/ExpenseEntryPanel.tsx#L60))
has no "Undo" action, so recovering from a mis-tap means finding the transaction
and deleting it manually.

**Proposed change**
Add an "Undo" action to the success toast that deletes the just-created row.
Requires the toast to accept an action button + handler and the log flow to
return the new id (it already does — `log.submit()` returns the id).

**Acceptance**
- After logging, the toast offers "Undo" for a few seconds; tapping it removes the
  entry.

---

## L1 — Icon-only affordances without visible labels · Priority: LOW · Optional

**Current behavior**
The hamburger, month chevrons, and the deleted-projects trash rely on iconography.
`accessibilityLabel`s are present (good for screen readers), but sighted users get
no text cue.

**Proposed change**
Where space allows, pair ambiguous icons with a short label, or choose less
ambiguous glyphs. (Overlaps with M6 for the trash icon.)

**Acceptance**
- Ambiguous controls are self-explanatory to sighted users, not just via a11y
  labels.

---

## L5 — Color as sole status signal · Priority: LOW · Optional (accessibility)

**Current behavior**
Budget pace uses green/yellow/red on a progress bar as the primary indicator
([`BudgetOverview.tsx:92`](../../src/features/finance/budget/BudgetOverview.tsx#L92)).
Color-blind users can't distinguish "on track" from "over."

**Proposed change**
Add a redundant non-color cue — a status word ("On track" / "Over budget") or an
icon — alongside the colored bar.

**Acceptance**
- Budget status is legible without relying on hue.

---

## L4 — Fixed font sizes; no dynamic-type support · Priority: LOW · Optional (accessibility)

**Current behavior**
Font sizes are fixed literals throughout (e.g. `fontSize: 11/13/17`). No evidence
of respecting OS text-scaling for low-vision users.

**Proposed change**
Move typography to a scalable scheme (respect `allowFontScaling`, or derive sizes
from a scale that tracks the OS setting) via the shared `Typography` component so
the change is centralized.

**Acceptance**
- Increasing the device font size scales the app's text within reason.

---

## L2 — Duplicated month-stepper implementations · Priority: LOW · Optional (maintainability)

**Current behavior**
`TransactionList` builds its own inline prev/next month nav
([`TransactionList.tsx:107-134`](../../src/features/finance/expenses/TransactionList.tsx#L107))
while Reports uses a shared `NavArrows` component
([`reports/NavArrows.tsx`](../../src/features/finance/reports/NavArrows.tsx)).

**Proposed change**
Consolidate into one reusable month-stepper control (promote `NavArrows` to
`components/` or extract a `MonthStepper`) and use it in both places so behavior
and styling stay in sync.

**Acceptance**
- Both screens use the same month-stepper component.

---

## L6 — Month-lock rigidity; no re-plan escape hatch · Priority: LOW · Optional (product decision)

**Current behavior**
Allocations lock per month after the first Confirm and can't change until next
month ([`AllocationScreen.tsx:120`](../../src/features/finance/budget/AllocationScreen.tsx#L120),
lock banners in `BudgetOverview` / `AllocationSettings`). Defensible, but a
mid-month life change (income drop, emergency) can't be re-planned.

**Proposed change**
Consider an explicit, confirm-guarded "Unlock / re-plan this month" escape hatch.
This is a product-design call, not just UI — weigh against the intended discipline
the lock enforces.

**Acceptance**
- If adopted: the user can deliberately re-plan a locked month behind a clear
  confirmation, without waiting for the next month.
