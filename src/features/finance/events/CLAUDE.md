# Events Feature Context

## Domain Responsibility
Occasions that cause spending (VS-61): a wedding, a funeral, a trip. Tagging the
expenses an occasion causes, across categories, says *why* the money went and what
the occasion really cost.

## Database Tables
- `events` — id, name, date (nullable `YYYY-MM-DD`), created_at, deleted_at (+ sync
  columns). Soft-deleted: the sync engine never sends deletions.
- `expenses.event_id` — the one event an expense was for, or NULL. Written by the
  `expenses` slice; read here by SQL.

`events` sits **before** `expenses` in `SYNCED_TABLES`, because restore and pull insert
in that order and an expense points at its event.

## Key Business Rules
- **One event per expense.** A taxi is for one occasion.
- **No event budget yet** (user decision 2026-10-22): an event shows its total, split by
  category, and its expenses.
- **Refunds follow their purchase.** A refund row takes its purchase's event, and moving
  a purchase to another event moves its refunds, so event totals are net.
- **Deleting an event frees its expenses**: they keep their amounts and lose the tag.
- Events are separate from planned lists: a list is things to buy, an event is an
  occasion that causes spending (much of it, like transport, never on a list).

## Cross-Feature
- `expenses → events` (approved, VS-61): `EventPicker` on the expense log and detail
  screens. Nothing else imports `events`; `events` imports no other slice (the event
  page renders its own expense rows and opens `/expenses/[id]` by path).

## Files
- `events.service.ts` — create / update / soft-delete, list with totals, the event page
- `events.hooks.ts` — `useEvents`, `useEventDetail`
- `events.types.ts`
- `EventsScreen.tsx` — the list (drawer → Events)
- `EventDetailScreen.tsx` + `EventDetailRoute.tsx` — one event's page
- `EventFormSheet.tsx` — name and optional date, for create and edit
- `EventPicker.tsx` — "Event" field on the expense screens, with "New event" on the spot
