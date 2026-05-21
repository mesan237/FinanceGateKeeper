---
description: Main daily command. Implements all milestone subtasks for the issue, with a plan-review checkpoint before code.
argument-hint: ISSUE-00X
---

Run the **full workflow** on `$1`. This is the main daily command for milestone-sized slices.

## Phase 1 — Read

1. Read `issues/$1/implementation-plan.md`. If missing, abort and instruct the user to create one.
2. Read `AGENTS.md`, `docs/ARCHITECTURE.md`, and the nearest `CLAUDE.md` files for every directory you will touch.
3. Read the matching `VS-XX` row in `docs/KANBAN.md` to confirm blockers are done.

## Phase 2 — Plan

Produce a concrete implementation plan that maps every Scope bullet in the issue file to:

- The exact files that will be created or modified.
- The order they will be written in (tests first per TDD).
- Any design decisions you had to make, with the alternative you rejected and why.

Print the plan. **Then stop and wait.** Do not write code until the user invokes `/workflows:full:approved`.

## Phase 3 — Implement (only after `/workflows:full:approved`)

1. Mark the VS as `🟡 In Progress` in `docs/KANBAN.md`.
2. For each milestone subtask in the plan: write the failing test, implement, refactor.
3. After each subtask, run the test suite. If it fails, fix before moving on.
4. When the full Scope is implemented, run `/check-arch` logic inline. Fix violations before continuing.
5. Invoke the `code-reviewer` subagent on the branch diff. Address any `BLOCK` findings.
6. Mark the VS as `✅ Done` in `docs/KANBAN.md`.

## Phase 4 — Close

Print:
- Files created/modified (count + list).
- Test results (passed / total).
- Reviewer verdict.
- The path to delete: `issues/$1/`.

Do not delete the issue file yourself. The user removes it after on-device verification.
