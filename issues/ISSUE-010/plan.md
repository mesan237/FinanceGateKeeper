# ISSUE-010 / VS-10 — Project Funding with Timeline — Phase 2 Implementation Plan

Concrete, file-by-file, TDD-ordered. Built on the VS-09 allocation-confirm flow and the funds slice
templates (`funds.service`, `FundDetailRoute`, `FundsOverview`), the income form (`IncomeLogScreen`), and
the `dailyReminder` trigger.

## Milestones (each: Red → Green → Refactor, run suite after)

### M1 — Shared util `addMonths`
1. **Red** — extend `src/utils/__tests__/formatDate.test.ts`: `addMonths` adds whole months UTC-stably,
   crossing year boundaries (e.g. `2026-11-15 +3 → 2027-02-15`).
2. **Green** — **Modify** `src/utils/formatDate.ts`: add `addMonths(d, n)` returning `YYYY-MM-DD`.

### M2 — Constants
- **Create** `src/constants/projects.ts` — `PROJECT_STATUS_VALUES`/`ProjectStatus`/`PROJECT_STATUS_SET`/
  `PROJECT_STATUS_LABELS`, `FUNDING_SOURCE_VALUES`/`FundingSource`, `TIMELINE_SHIFT_THRESHOLD_MONTHS = 1`.
  (No standalone test; consumed by M3.)

### M3 — Database
- **Create** `src/services/migrations/012_create_projects_table.ts` (`projects`, `idx_projects_priority`).
- **Create** `src/services/migrations/013_create_project_transactions_table.ts`
  (`project_transactions` + `idx_project_transactions_project_id`).
- **Modify** `src/services/migrations/index.ts` — register 12, 13. (Exercised by M4.)

### M4 — Types + projects.service (core)
1. **Red** — `src/features/finance/projects/__tests__/projects.service.test.ts` (in-memory SQLite, mirrors
   `funds.service.test.ts`). Covers TDD anchor #1: `createProject` rank assignment, `getProjects` order,
   `fundProjects` cascade (rank 1 → target before rank 2; overflow; auto-complete; paused/completed
   skipped; one `allocation` txn per funded project), `reorderPriority` changes fill order,
   `estimateTimeline` math + null cases, `detectShift` threshold, `contributeManually`.
2. **Green** —
   - **Create** `src/features/finance/projects/projects.types.ts` (`Project`, `NewProject`,
     `ProjectTransaction`, `TimelineEstimate`, `TimelineShift`; re-export enums from constants).
   - **Create** `src/features/finance/projects/projects.service.ts` — functions per the issue.
     Balance mutations use `BEGIN TRANSACTION`/`COMMIT`/`ROLLBACK` (per-funded-project), mirroring
     `funds.service`. Watch the 300-line cap — if close, split the cascade/timeline math into
     `projects.funding.ts` (decoupled, re-exported), the way `budget.redistribution.ts` was split.

### M5 — projectTimeline notification trigger
1. **Red** — `src/notifications/triggers/__tests__/projectTimeline.test.ts`: `buildProjectTimelineAlert`
   returns `type: 'projectTimeline'` + non-empty copy.
2. **Green** — **Create** `src/notifications/triggers/projectTimeline.ts` (pure; copy from
   `MESSAGES.projectTimeline`, which already exists).

### M6 — projects.hooks
1. **Red** — `src/features/finance/projects/__tests__/projects.hooks.test.ts`: `useProjects` loads list +
   timeline (rate from a mocked `budget.getMonthlyBudget`), `useProjectDetail` exposes txns + mutations,
   `useProjectPriority` reorders. Services mocked.
2. **Green** — **Create** `src/features/finance/projects/projects.hooks.ts`. Timeline derived by passing
   `getMonthlyBudget(month).breakdown.projects` into the pure `estimateTimeline` (`projects → budget`,
   approved).

### M7 — ProjectListScreen
1. **Red** — `src/features/finance/projects/__tests__/ProjectListScreen.test.tsx`: ranked rows with
   progress + completion dates; "Add" → `/projects/create`; row → `/projects/[id]`; empty state.
2. **Green** — **Create** `src/features/finance/projects/ProjectListScreen.tsx` (`Card`, `ProgressBar`).

### M8 — ProjectForm
1. **Red** — `src/features/finance/projects/__tests__/ProjectForm.test.tsx`: validates name + positive
   target; submit → `createProject`.
2. **Green** — **Create** `src/features/finance/projects/ProjectForm.tsx` (create/edit; `TextInput`).

### M9 — ProjectDetail + route wrapper
1. **Red** — `src/features/finance/projects/__tests__/ProjectDetail.test.tsx`: progress + timeline +
   history; pause/resume → `setStatus`; manual contribution → `contributeManually`.
2. **Green** — **Create** `ProjectDetail.tsx` and `ProjectDetailRoute.tsx` (mirrors `FundDetailRoute`).

### M10 — TimelineRecalcAlert
1. **Red** — `src/features/finance/projects/__tests__/TimelineRecalcAlert.test.tsx`: shows old vs new
   dates; the three options (Accept delay / Pull from savings / Reprioritize) each trigger their action.
2. **Green** — **Create** `src/features/finance/projects/TimelineRecalcAlert.tsx` (`Modal`/`Button`).

### M11 — Allocation confirm wiring
1. **Red** — extend `src/features/finance/budget/__tests__/AllocationScreen.test.tsx`: confirm calls
   `fundProjects(breakdown.projects, …)`; skips when projects amount is 0; still funds + locks.
2. **Green** — **Modify** `src/features/finance/budget/AllocationScreen.tsx` `handleConfirm`: after the
   emergency/savings deposits, `if (breakdown.projects > 0) await fundProjects(breakdown.projects, reason)`.

### M12 — Routes + architecture doc
- **Modify** `src/app/(tabs)/projects.tsx` — render `<ProjectListScreen />` (replace stub).
- **Create** `src/app/projects/create.tsx` (→ `ProjectForm`), `src/app/projects/[id].tsx`
  (→ `ProjectDetailRoute`).
- **Modify** `docs/ARCHITECTURE.md` + root `CLAUDE.md` — add `projects` to budget's approved row (#1).

### M13 — Gates
- `/check-arch` inline: only new cross-feature edges are `budget → projects` (newly approved) and
  `projects → budget`; `projects` must not import `funds`/`income`/`expenses`; routes thin; `@/` paths;
  FCFA via `formatCurrency`.
- `code-reviewer` subagent on the diff; address any `BLOCK` (watch 300-line caps).
- Mark VS-10 `✅ Done` in `docs/KANBAN.md` (test count + migrations 012, 013).

## Design decisions (rejected alternatives)

1. **Add `budget → projects` to the approved cross-feature table; fund projects from `AllocationScreen`**
   — mirrors `budget → funds` and the budget `CLAUDE.md` flow. *Rejected:* routing-layer orchestration of
   confirm-time funding (splits one action across layers). **Needs sign-off.**
2. **Disruption alert evaluated on-demand** (on project view / recalc), not pushed on emergency
   withdrawal — `funds → projects` isn't approved. Full machinery ships; event push deferred.
   *Rejected:* immediate cross-feature push. **Needs sign-off.**
3. **Cascade funding strictly by ascending rank** (rank 1 to target before rank 2; overflow cascades;
   auto-complete; skip paused/completed). *Rejected:* proportional split (violates the requirement).
4. **`estimateTimeline` pure, `monthlyRate` injected** = `getMonthlyBudget(month).breakdown.projects`.
   *Rejected:* computing income inside `projects.service` (unapproved `projects → income`).
5. **Per-funded-project SQLite transactions** (mirrors `funds.service`). *Rejected:* unguarded multi-write.
6. **`addMonths` in shared `utils/formatDate.ts`** (generic, reused by debt/reports). *Rejected:*
   feature-local helper.
7. **Split `projects.service` if it nears 300 lines** into `projects.funding.ts` (decoupled, re-exported)
   — pre-empts the cap that blocked VS-09's first review.

## Deferred (out of scope this slice)
Immediate push on emergency withdrawal; automatic "pull from savings" execution; deadline-vs-estimate
warnings; dashboard project card (VS-13); Supabase mirroring (VS-15).
