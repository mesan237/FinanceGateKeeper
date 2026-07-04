# UX Audit — Finance Gatekeeper

A first-time-user usability audit of the app, split into an actionable roadmap.
Work the phases top to bottom: each phase is ordered high → low priority, and
earlier phases unblock later ones.

## Root theme
A first-time user is never told what the app *is* or *how it thinks*. The two
concepts that define the product — **allocation buckets** and **Learning vs
Control mode** — are never introduced, and the headline feature (budgeting) is
hidden by default. Most individual issues are symptoms of this root cause.

## How this maps to the board

These docs are the **rationale** (the "why", with evidence). The **actionable
work** lives on the Kanban board as vertical slices **VS-23 → VS-31**
(`docs/KANBAN.md`, "UX AUDIT" section), grouped by theme rather than one-per-
finding. (VS-22 was already taken by the Profile slice, so numbering starts at
23.) Full implementation plans exist for Phase 1 (start-now) slices; the rest are
KANBAN Backlog entries whose plans are authored when picked up.

| Phase | Theme | Rationale | Slices (KANBAN) | Plans |
|-------|-------|-----------|-----------------|-------|
| 1 | Comprehension | [phase-1](phase-1-comprehension.md) | VS-23, VS-24, VS-25 | `issues/ISSUE-023/`, `ISSUE-024/`, `ISSUE-025/` |
| 2 | Consistency | [phase-2](phase-2-consistency.md) | VS-26, VS-27 | on pickup |
| 3 | Polish | [phase-3](phase-3-polish.md) | VS-28, VS-29, VS-30 | on pickup |
| 4 | Refinements | [phase-4](phase-4-refinements.md) | VS-31 | on pickup |

### Audit issue → slice crosswalk
| Audit | Slice | Audit | Slice | Audit | Slice |
|-------|-------|-------|-------|-------|-------|
| H1 | VS-23 | H2 | VS-26 | M1 | VS-28 |
| H3 | VS-24 | H5 | VS-27 | M2 | VS-28 |
| H4 | VS-25 | M3 | VS-26 | M4 | VS-29 |
| M7 | VS-24 |     |       | M5 | VS-30 |
|    |       |     |       | M6 | VS-30 |
|    |       |     |       | L1–L6 | VS-31 |

## Issue index
Each issue has a stable ID used across the phase files.

### High
- **H1** — No onboarding; core mental model never explained → Phase 1
- **H2** — Two inconsistent "Add transaction" patterns → Phase 2
- **H3** — Core feature hidden by default, unlock undiscoverable → Phase 1
- **H4** — Allocation screen can't edit split yet locks the month → Phase 1
- **H5** — Reports tab contradicts Learning mode → Phase 2

### Medium
- **M1** — Reports has no empty/error-only state (blank screen) → Phase 3
- **M2** — Inconsistent empty/loading states across screens → Phase 3
- **M3** — Two header systems + mixed back/cancel metaphors → Phase 2
- **M4** — Reminder time is a raw `HH:mm` text field → Phase 3
- **M5** — Drawer half-full of disabled "Soon" dead links → Phase 3
- **M6** — Accounts/Categories buried; deleted-projects trash icon → Phase 3
- **M7** — "Zero Day" is unexplained jargon → Phase 1

### Low
- **L1** — Icon-only affordances without visible labels → Phase 4
- **L2** — Duplicated month-stepper implementations → Phase 4
- **L3** — No undo on instant/quick actions → Phase 4
- **L4** — Fixed font sizes; no dynamic-type support → Phase 4
- **L5** — Color as sole status signal → Phase 4
- **L6** — Month-lock rigidity, no re-plan escape hatch → Phase 4

## Overall score at time of audit: 6.5 / 10
Strong foundations (theming, a11y labels, haptics, refresh behavior) held back
by first-run comprehension and consistency gaps. Completing Phases 1–2 alone
should move this to ~8.
