---
description: Update KANBAN.md status for a vertical slice. Moves a task between Backlog, In Progress, and Done.
argument-hint: VS-XX <status>
---

Update the status of `$1` in `docs/KANBAN.md` to `$2`.

`$2` must be one of: `backlog`, `in-progress`, `done`.

Steps:

1. Read `docs/KANBAN.md`.
2. Locate the `## TASK STATUS TEMPLATE` table near the bottom.
3. Find the row whose first cell starts with `$1:` (e.g., `VS-03: Expense Logging`).
4. Replace the Status cell with the matching emoji + label:
   - `backlog` → `🔲 Backlog`
   - `in-progress` → `🟡 In Progress`
   - `done` → `✅ Done`
5. If the user passed extra text after the status, append it to the Notes column (trimmed). Otherwise leave Notes alone.
6. Save the file. Print the updated row.

If `$1` doesn't match any row, print the available task IDs and exit without changes.

Do not touch any other rows. Do not touch other files.
