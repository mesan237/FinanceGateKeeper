# ISSUE-010 — Project Funding with Timeline

**Maps to:** KANBAN VS-10
**Priority:** High
**Blocked by:** VS-06 Budget Allocation (✅ Done). Builds directly on the VS-09 allocation-confirm
deposit flow (`AllocationScreen.handleConfirm` already funds emergency/savings).

---

## Problem Statement

The allocation engine splits income into four buckets and — since VS-09 — actually deposits the
emergency and savings portions. The **projects** bucket is still inert: its FCFA amount is computed and
shown, then dropped. VS-10 makes projects real:

1. **Persisted, priority-ranked projects.** The user creates funding goals ("BRVM Investment —
   200,000", "E-commerce Launch — 500,000") with a priority rank, optional deadline, and a status.
2. **Priority-cascade funding.** On allocation confirm, the projects-bucket amount flows to the
   highest-priority *active* project until it hits its target, then overflows to the next, and so on.
   A project that reaches its target auto-completes; paused/completed projects are skipped.
3. **Timeline estimation.** Each active project shows an estimated completion date from its remaining
   gap and the monthly project-funding rate.
4. **Disruption alerts.** When the timeline shifts beyond a threshold (e.g. after an emergency-fund
   withdrawal shrinks future funding), the app surfaces a `TimelineRecalcAlert` with options.

Two constraints shape the design:

- **Funding is a side effect of confirming an allocation**, exactly like funds — so the wiring lives in
  budget's `AllocationScreen`. That requires a `budget → projects` import, which is **not yet on the
  approved cross-feature list** (it lists only `expenses`, `funds`). See Design Decision #1.
- **Notifications never query the DB.** `projectTimeline.ts` is a pure payload builder; the *decision*
  to fire it is made by the feature after a recalc (mirrors `zeroDayCheck`).

## User Stories

- **As the builder,** I create "BRVM Investment — 200,000 FCFA" (priority 1) and "E-commerce Launch —
  500,000 FCFA" (priority 2), and see them ranked with funding progress bars.
- **As the builder,** when I confirm an income allocation, the projects amount fully funds BRVM before
  E-commerce receives anything; when BRVM hits 200,000 it auto-completes and the overflow goes to
  E-commerce.
- **As the builder,** each active project shows an estimated completion date based on my monthly project
  funding rate.
- **As the builder,** when a disruption pushes a project's completion out by more than the threshold, I
  get an alert: "E-commerce moved from March to April — accept the delay, pull from savings, or
  reprioritize."
- **As the builder,** I can reorder project priority, pause a project (funding skips it), and edit its
  target/deadline.

## Scope

Each bullet maps to a concrete file. Implementation order is top-to-bottom (tests precede implementation
per TDD).

### Constants

- `src/constants/projects.ts` — **new**, mirroring `constants/funds.ts`:
  - `PROJECT_STATUS_VALUES = ['active', 'completed', 'paused'] as const`, `type ProjectStatus`,
    `PROJECT_STATUS_SET`, `PROJECT_STATUS_LABELS`.
  - `FUNDING_SOURCE_VALUES = ['allocation', 'manual'] as const`, `type FundingSource`.
  - `TIMELINE_SHIFT_THRESHOLD_MONTHS = 1` — the recalc alert fires when completion moves by ≥ this many
    months.

### Shared util

- `src/utils/formatDate.ts` — **modified**: add `addMonths(d: Date | string, n: number): string`
  (UTC-stable `YYYY-MM-DD`, matching `toISODate`) for projecting completion dates. Pure; unit-tested.

### Database

- `src/services/migrations/012_create_projects_table.ts` — **new**: `projects` table —
  `id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, target_amount INTEGER NOT NULL,
  funded_amount INTEGER NOT NULL DEFAULT 0, priority_rank INTEGER NOT NULL, deadline TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','paused')),
  created_at TEXT NOT NULL`, plus `CREATE INDEX idx_projects_priority ON projects(priority_rank)`.
- `src/services/migrations/013_create_project_transactions_table.ts` — **new**: `project_transactions` —
  `id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id),
  amount INTEGER NOT NULL, date TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('allocation','manual')), created_at TEXT NOT NULL`,
  plus `idx_project_transactions_project_id`.
- `src/services/migrations/index.ts` — **modified** to register migrations 12 and 13.

### Types — `src/features/finance/projects/projects.types.ts` (new)

- Re-export `ProjectStatus`, `FundingSource` from `@/constants/projects`.
- `Project { id; name; targetAmount; fundedAmount; priorityRank; deadline: string | null; status: ProjectStatus; createdAt }`.
- `NewProject = { name; targetAmount; deadline?: string | null }` (rank assigned by the service;
  status defaults to active).
- `ProjectTransaction { id; projectId; amount; date; source: FundingSource; createdAt }`.
- `TimelineEstimate { projectId; monthsRemaining: number | null; completionDate: string | null }`
  (`null` when there is no funding rate or the project is already complete).
- `TimelineShift { projectId; previous: string | null; next: string | null; shiftedMonths: number }`.

### Projects feature — `src/features/finance/projects/`

- `projects.service.ts` — **new**. Pure logic + DB calls, no JSX/React:
  - `createProject(input: NewProject): Promise<number>` — appends at the lowest priority (max rank + 1).
  - `getProjects(): Promise<Project[]>` — ordered by `priority_rank`.
  - `getProjectById(id): Promise<Project | null>`.
  - `updateProject(id, patch): Promise<void>` — name/target/deadline; re-derives `status` if target met.
  - `setStatus(id, status): Promise<void>` — pause/resume/complete.
  - `deleteProject(id): Promise<void>` — removes the row and re-packs ranks.
  - `reorderPriority(orderedIds: number[]): Promise<void>` — rewrites `priority_rank` from the given order.
  - `fundProjects(projectsAmount: number, dateISO?): Promise<void>` — the cascade: walk active projects
    by ascending rank, fill each to its target, overflow to the next; mark a filled project `completed`;
    skip paused/completed; record a `project_transactions` row (`source: 'allocation'`) per funded
    project. Each project's balance update + transaction insert run in one SQLite transaction
    (mirrors `funds.service`/`runRecurringAutoLog`). Any leftover when all active projects are full is a
    no-op (stays unallocated this cycle).
  - `contributeManually(id, amount, dateISO?): Promise<void>` — manual top-up (`source: 'manual'`).
  - `estimateTimeline(project, monthlyRate): TimelineEstimate` — **pure**: `monthsRemaining =
    ceil((target − funded) / monthlyRate)`, `completionDate = addMonths(today, monthsRemaining)`;
    returns nulls when `monthlyRate <= 0` or the project is complete.
  - `getProjectTransactions(projectId): Promise<ProjectTransaction[]>` — newest first.
  - `detectShift(previous, next): TimelineShift | null` — compares two estimates, returns a shift only
    when `|Δmonths| >= TIMELINE_SHIFT_THRESHOLD_MONTHS`.
- `projects.hooks.ts` — **new**: `useProjects()` (list + per-project timeline, derived from the current
  month's project rate), `useProjectDetail(id)` (project + transactions + mutations), `useProjectPriority()`
  (reorder). The monthly project rate is read from budget — `getMonthlyBudget(monthISO).breakdown.projects`
  (`projects → budget` is approved) — and passed into the pure `estimateTimeline`.
- `ProjectListScreen.tsx` — **new**. Priority-ranked list with funding progress bars and estimated
  completion dates; "Add project" → `/projects/create`; rows → `/projects/[id]`. Reuses `Card`,
  `ProgressBar`, `Typography`.
- `ProjectDetail.tsx` — **new**. Progress, timeline, funding history, controls: edit, pause/resume,
  reprioritize entry point, manual contribution.
- `ProjectForm.tsx` — **new**. Create/edit (name, target, optional deadline).
- `ProjectDetailRoute.tsx` — **new**, mirrors `FundDetailRoute`: validates `useLocalSearchParams<{ id }>()`,
  renders `<ProjectDetail projectId={…} />`.
- `TimelineRecalcAlert.tsx` — **new**. Modal showing the old vs new completion date and three options —
  **Accept delay** (dismiss), **Pull from savings** (navigates to the savings fund / withdrawal flow via
  a route string), **Reprioritize** (opens the reorder UI). Reuses shared `Modal`/`Button`.

### Notifications — `src/notifications/triggers/`

- `projectTimeline.ts` — **new**, pure: `buildProjectTimelineAlert(shift: TimelineShift):
  NotificationPayload` (`type: 'projectTimeline'`, copy from `MESSAGES.projectTimeline`). No DB.
  (`NotificationType` already includes `projectTimeline`; `MESSAGES.projectTimeline` already exists.)

### Budget feature — the wiring

- `src/features/finance/budget/AllocationScreen.tsx` — **modified** `handleConfirm`: after the existing
  emergency/savings deposits, if `breakdown.projects > 0` call
  `projects.service.fundProjects(breakdown.projects, …)`. Requires the `budget → projects` edge
  (Design Decision #1).

### Routes / Layout

- `src/app/(tabs)/projects.tsx` — **modified**: replace the `<View />` stub with `<ProjectListScreen />`.
- `src/app/projects/create.tsx` — **new**, thin: renders `<ProjectForm />`.
- `src/app/projects/[id].tsx` — **new**, thin: renders `<ProjectDetailRoute />`.

### Architecture doc

- `docs/ARCHITECTURE.md` + root `CLAUDE.md` — **modified**: add `projects` to the budget row of the
  approved cross-feature table (Design Decision #1). One line each.

## TDD Anchors

Failing tests to write first; the slice is done when they all pass.

1. **`projects.service.test.ts`** — in-memory SQLite (mirrors `funds.service.test.ts`):
   - `createProject` appends at max rank + 1; `getProjects` returns priority order.
   - `fundProjects` fully funds rank 1 before rank 2 receives anything; the overflow after rank 1 hits
     target cascades to rank 2.
   - a project reaching its target is marked `completed` and is skipped on the next `fundProjects`.
   - paused projects are skipped; funding goes to the next active project.
   - `reorderPriority` changes which project the next `fundProjects` fills first.
   - each funded project gets one `project_transactions` row with `source: 'allocation'`.
   - `estimateTimeline` is accurate: `(target − funded) / monthlyRate` → months, `addMonths` →
     completion date; returns nulls for a zero rate and for a completed project.
   - `detectShift` returns a shift only at/over the threshold.

2. **`addMonths` (formatDate test, extended)** — adds whole months UTC-stably across year boundaries.

3. **`projectTimeline.test.ts`** — `buildProjectTimelineAlert` returns `type: 'projectTimeline'` with
   non-empty title/body.

4. **`projects.hooks.test.ts`** — `useProjects` loads list + timeline; mutations re-fetch (service mocked).

5. **`ProjectListScreen.test.tsx`** — renders ranked projects with progress + completion dates; "Add"
   navigates to `/projects/create`; row tap → `/projects/[id]`; empty state.

6. **`ProjectForm.test.tsx`** — validates name + positive target; submit calls `createProject`.

7. **`TimelineRecalcAlert.test.tsx`** — renders old vs new dates; each of the three options triggers its
   action (dismiss / navigate / reorder).

8. **`AllocationScreen.test.tsx`** (extended) — confirm calls `fundProjects(breakdown.projects, …)`;
   skips the call when the projects amount is 0; still deposits funds and locks.

## Acceptance Check (Done When)

- Creating two projects shows them priority-ranked with progress bars and estimated completion dates.
- Confirming an allocation funds the rank-1 project to target before the rank-2 project receives
  anything; a completed project hands its overflow to the next in line.
- Pausing a project removes it from the funding cascade; reordering changes who is funded first.
- A timeline shift beyond the threshold surfaces `TimelineRecalcAlert` with the three options.
- `npm test` — all new/extended test files pass; the full suite stays green.

## Design Decisions

> **⚠️ Decisions (1) and (2) need your sign-off at the approval checkpoint — (1) amends the architecture's
> cross-feature table; (2) sets the scope boundary of the disruption alert. Veto either before I implement.**

- **(1) Add `budget → projects` to the approved cross-feature dependency list.** Funding projects on
  allocation confirm is the same pattern VS-09 used for funds, and the budget `CLAUDE.md` allocation flow
  already says "amounts are deposited to funds/projects via their respective services" — the dependency
  table simply never listed `projects`. So `AllocationScreen` will import `projects.service.fundProjects`,
  and I'll add `projects` to budget's row in `docs/ARCHITECTURE.md` + root `CLAUDE.md`. `projects` still
  imports `budget` (allocation %/rate) — already approved — and never the reverse for funding.
  *Rejected alt:* orchestrate the confirm-time funding from the `app/` routing layer (which may import any
  feature) instead of from `AllocationScreen`. Why rejected: it splits one confirm action across two
  layers and diverges from the funds precedent. *If you'd rather not touch the table, I'll switch to the
  routing-layer orchestration.*

- **(2) The disruption alert is evaluated on demand (when projects are viewed / after a recalc), not
  pushed the instant an emergency withdrawal happens.** `funds → projects` is not an approved edge, and
  wiring an immediate cross-feature event would need app-layer plumbing. VS-10 ships the full machinery —
  `detectShift`, `TimelineRecalcAlert`, and the `projectTimeline` payload builder — and surfaces the alert
  when `useProjects`/`ProjectDetail` recompute and find a shift ≥ threshold. *Rejected alt:* an immediate
  push from the funds-withdrawal path. Why rejected: out of proportion and crosses an unapproved edge;
  on-view detection meets the "Done when" without it. *Deferred piece called out in Out of Scope.*

- **Priority-cascade funding fills strictly by ascending rank.** Rank 1 is filled to target before rank 2
  receives anything; overflow cascades; filled projects auto-complete; paused/completed are skipped. This
  is the PRD/KANBAN rule and keeps funding deterministic. *Rejected alt:* proportional split across active
  projects — contradicts the "rank 1 fully funded first" requirement.

- **Timeline estimation is a pure function taking `monthlyRate`.** The rate is the current month's
  projects-bucket amount (`getMonthlyBudget(month).breakdown.projects`), supplied by the hook. Keeps the
  math unit-testable and avoids `projects → income` (not approved); budget already composes income.
  *Rejected alt:* compute average income inside `projects.service` — needs an unapproved income import.

- **Each project's balance change is a single SQLite transaction**, and the cascade does one transaction
  per funded project (mirrors `funds.service`/`runRecurringAutoLog`) — a crash can't leave a funding row
  disagreeing with `funded_amount`.

- **`addMonths` lives in shared `utils/formatDate.ts`**, not the feature — it's generic date math other
  slices (debt due dates, reports) will reuse, consistent with `toISODate`/`currentMonthISO`.

## Out of Scope (Deferred)

- **Immediate push notification on emergency withdrawal** (auto-recalc the instant funds drop). VS-10
  detects shifts on view and can fire `projectTimeline`; event-driven cross-feature wiring is deferred.
- **"Pull from savings" execution.** `TimelineRecalcAlert`'s option navigates to the savings withdrawal
  flow (VS-09); automatically moving money from savings into a project is deferred.
- **Deadline-vs-estimate warnings** (flagging when the estimate overshoots a set `deadline`) — the column
  is stored and displayed; comparison logic is a follow-up.
- **Dashboard project card** (`top active project status`) → VS-13.
- **Supabase mirroring** of `projects`/`project_transactions` → VS-15.

## After This Slice

1. Run `/check-arch` to confirm no dependency-rule violations (special attention: the only new
   cross-feature edges are `budget → projects` (newly approved in #1) and `projects → budget`; `projects`
   must not import `funds`, `income`, or `expenses`).
2. Invoke the `code-reviewer` subagent on the branch diff. Address any `BLOCK` findings (watch the
   300-line cap on `projects.service.ts`).
3. Mark VS-10 as `✅ Done` in `docs/KANBAN.md` with the test count and migration numbers (012, 013).
4. Delete `issues/ISSUE-010/` after on-device verification.
