---
description: Before starting a milestone, validate that issues/ISSUE-00X/implementation-plan.md covers everything in the matching KANBAN slice.
argument-hint: ISSUE-00X
---

Validate coverage of `$1`'s implementation plan before any code is written.

Steps:

1. Read `issues/$1/implementation-plan.md`. If missing, abort with an instruction to create it.
2. Locate the matching `VS-XX` entry in `docs/KANBAN.md` (ISSUE-001 ↔ VS-01, ISSUE-002 ↔ VS-02, etc.).
3. Compare:
   - Every **Scope** bullet in the KANBAN entry must appear in the implementation plan with a concrete file path.
   - Every **TDD Anchor** test in the KANBAN entry must appear in the plan as a test file to write.
   - The **Done when** statement must be reflected in an explicit acceptance check.
4. Cross-check with `docs/ARCHITECTURE.md`:
   - Every file the plan creates lands in a directory allowed by the architecture.
   - Every import the plan mentions respects the dependency rules.
   - Naming conventions match.
5. Cross-check blockers: every `VS-YY` listed as a blocker in KANBAN must be marked `✅ Done`. Flag any that aren't.

Output:

```
## Missing from plan
- <KANBAN scope bullet not addressed>

## Missing tests
- <TDD Anchor not mapped to a test file>

## Architecture concerns
- <file path violates dependency rule X>

## Unfinished blockers
- VS-YY (status: <current>)

## Verdict
READY / NOT READY
```

If `READY`, the user can safely invoke `/workflows:full:implement $1`. If `NOT READY`, the issue plan needs editing first.

Read-only. Do not modify any files.
