# ISSUE-037 — VS-39: Planned purchases — due dates, reminders and the drawer dot

## Problem Statement

Planned purchases (VS-36) had an optional, informational date and nothing that
reminded the user. Lists were easy to forget until the day had passed.

## Product Decisions (confirmed)

1. **A list's shopping day is required.** New lists cannot be saved without
   one, and it can be moved but not cleared.
2. **Items inherit the list's day.** An item may carry its own date, which
   overrides the list's for that item only.
3. **Warning window: 3 days**, the same as the debt reminders.
4. **All three alerts:** phone notifications, a dot on the drawer row (and on
   the menu button), and a dashboard card.
5. **Quick postpone** for items due soon or overdue: one day, one week, or a
   picked date. Postponing gives the item its own date; the list keeps its day.

## Design

### Schema

- Migration `033_add_planned_list_due_date`: `planned_lists.due_date TEXT`,
  nullable so older lists stay valid, plus the `planned_lists` update trigger
  rebuilt with the column.
- Supabase: patch `039_planned_list_due_date.sql`; `schema.sql` and `037` carry
  the column. Run 039 **before** installing a build with migration 033.

### `planned` slice

- `planned.due.ts` (pure): `todayISO`, `daysUntil`, `dueStatus`
  (`overdue | today | soon | later`), `needsAttention`, `effectiveDueDate`,
  `postponedDate`.
- `planned.service.ts`: `createList(name, dueDate)` requires the date;
  `setListDueDate(id, dueDate)`; `getLists` returns `dueDate`.
- `planned.dueItems.ts`: `getDueItems()` (open items with
  `COALESCE(item date, list date)`) and `countAttention`.
- `planned.reminders.ts`: `planReminders(items, now)` (one reminder per list and
  day: a heads-up at 09:00 three days before, 09:00 on the day, the next 09:00
  while overdue) and `reconcilePlannedReminders` (cancel `plannedDue`, schedule
  fresh, return the counts).
- `planned.events.ts`: `onPlannedChange` / `notifyPlannedChange`, fired by every
  hook mutation.
- Hooks: `create(name, dueDate)`, `listDueDate`, `setDueDate`, `postpone`;
  `usePlannedLists` refreshes on change; `usePlannedReminders` re-plans on mount,
  on change and on foreground, and publishes the counts.
- UI: `NewListSheet` (required day, starts empty), `DueBadge`, `ListDueField`,
  `PostponeSheet`, badges and Postpone on `PlannedItemRow`, and a hint on the
  item sheet's date. `PlannedReminderScheduler` mounted at the root.

### Shared infra

- `components/AttentionProvider` + `constants/attention`: features publish
  counts under a key, and chrome reads them. This keeps the dashboard and the
  drawer from importing `planned`.
- `components/AttentionDot`, `components/MenuButton` (moved out of the tabs
  layout), and a dot on the drawer's Planned purchases row.
- `notifications/triggers/plannedDue.ts` and the `plannedDue` type.

### `dashboard` slice

- `PlannedDueCard`, reading the attention counts and tapping through to `/planned`.

## Out of scope

- Honouring the "notifications" setting for these reminders (debt reminders
  don't either).
- Postponing a whole list from the overview; open the list and move its day.
