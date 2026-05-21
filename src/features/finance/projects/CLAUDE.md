# Projects Feature Context

## Domain Responsibility
Manages future projects (investments, business launches, purchases) with funding targets, priority ranking, and timeline estimation.

## Database Tables
- `projects` — id, name, target_amount, funded_amount, priority_rank (integer, 1 = highest), deadline (nullable), status (active | completed | paused), created_at
- `project_transactions` — id, project_id, amount, date, source (allocation | manual), created_at

## Key Business Rules
- Projects are funded from the allocation system's project percentage.
- Funding flows by priority: rank 1 is fully funded before rank 2 begins receiving.
- If rank 1 reaches target, it auto-completes and funding shifts to rank 2.
- Timeline estimate: `(target_amount - funded_amount) / monthly_project_allocation_rate = months_remaining`.
- Monthly project allocation rate = total average monthly income × projects_pct, then split by priority.
- When budget is disrupted (emergency withdrawal, income drop), recalculate all timelines and alert user via `TimelineRecalcAlert`.
- Alert options: accept delay, temporarily pull from savings, reprioritize projects.
- Paused projects are skipped in funding — allocation goes to next active project.

## Files in This Feature
- `ProjectListScreen.tsx` — Priority-ranked list with progress bars
- `ProjectDetail.tsx` — Full detail, funding history, timeline
- `ProjectForm.tsx` — Create/edit form
- `TimelineRecalcAlert.tsx` — Disruption alert with options
- `projects.hooks.ts` — useProjects, useProjectTimeline, useProjectPriority
- `projects.service.ts` — CRUD, funding, timeline math, priority reorder
- `projects.types.ts` — Project, ProjectStatus, TimelineEstimate, ProjectTransaction
