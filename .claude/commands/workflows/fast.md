---
description: Fast path for simple tasks — one pattern, no design decisions. Implements the issue end-to-end without an approval gate.
argument-hint: ISSUE-00X
---

Run the **fast workflow** on `$1`.

This mode is for slices that follow an existing pattern with no design decisions left to make. There is no approval checkpoint — you read the plan, implement, and stop.

Steps:

1. Read `issues/$1/implementation-plan.md`. If it does not exist, abort and tell the user to create one (the plan must exist before code is written).
2. Read `AGENTS.md` and the nearest `CLAUDE.md` files for the directories you will touch.
3. Run `/workflows:full:review-todo $1` logic inline: confirm every Scope bullet has a clear placement and every TDD Anchor maps to a concrete test file.
4. Implement the slice using TDD: write each failing test first, then make it pass.
5. Update `docs/KANBAN.md` via the same logic as `/log-slice` — mark the matching VS as `🟡 In Progress` at start and `✅ Done` at finish.
6. Run the test suite. Report pass/fail.
7. Run `/check-arch` logic inline and report any violations.
8. If clean: print a one-line summary and the path to delete (`issues/$1/`). Do NOT delete it — the user removes the file after they verify on-device.

Forbidden in fast mode:

- Asking design questions mid-implementation. If a real design decision surfaces, **stop** and tell the user to switch to `/workflows:full:implement $1`.
- Editing the implementation plan. Plans are inputs, not workspaces.
- Touching files outside the slice scope.
