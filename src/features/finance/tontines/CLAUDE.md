# Tontines Feature Context

## Domain Responsibility
Rotating savings groups (VS-51): every cycle each member pays the same contribution and
one member takes the whole pot. There are as many cycles as members, so over a round the
user pays in exactly what they receive. Modelled as its own entity with a rotation, by
the user's decision (2026-10-18), rather than as a goal or a recurring bill.

## The money rules (user decisions, 2026-10-18)
- **Neither spending nor income.** A contribution leaves a wallet and the payout lands in
  one. Only wallet balances read `tontine_payments` — by SQL, in
  `accounts.balance.getAccountBalance`, like debt repayments and transfers. Nothing here
  touches the budget, the month's spend or income.
- **Scheduled, ticked when paid.** The schedule is never stored: cycle *n*'s date derives
  from `start_date` and `frequency` (`tontines.schedule.cycleDate`). Weekly steps 7 days;
  monthly keeps the start's day, clamped in short months without drifting. Ticking a
  cycle stores one contribution (the tontine's amount) through the chosen wallet.
- **Payout turn optional.** NULL until the draw. The payout date is the turn's cycle date;
  the pot is `contribution × members`. The recorded payout amount may be lower (a fee).
  A payout can only be recorded once the turn is set, and only once.

## Database Tables (migration 045, Supabase patch 049; both synced)
- `tontines` — id, name, contribution_amount (> 0), frequency (`weekly` | `monthly`),
  start_date, members (2–60, = cycles), payout_turn (NULL or 1..members), account_id
  (usual wallet, nullable), created_at, deleted_at.
- `tontine_payments` — id, tontine_id, kind (`contribution` | `payout`), cycle, amount
  (> 0), account_id (nullable), date, created_at, deleted_at. One live contribution per
  cycle and one live payout per tontine (service-enforced).
- **Soft delete only**, both tables. Deleting a tontine stops its payments moving wallet
  balances (the confirm sheet says so); un-ticking soft-deletes the payment.

## Derived figures (`tontines.schedule.summarise`, pure)
- Cycle status: `paid`, `overdue` (date passed), `due` (today to `DUE_SOON_DAYS` = 3
  ahead), `upcoming`.
- `position = paidIn − received`: positive → the group owes the user ("ahead"),
  negative → the user still owes it in contributions ("behind").
- `isFinished` once every contribution is paid and the payout recorded.

## Dependencies
- `tontines` → `accounts`: `AccountPicker`, `useDefaultAccountId` (form, payment sheet).
- `accounts` reads `tontine_payments` (joined to live `tontines`) by SQL for balances.
- `budget` → `tontines`: `getDueContributions` only, for committed money (VS-52).

## Reminders and attention (VS-52)
- `tontines.due.getDueContributions(through?)` lists every unpaid contribution due by a
  date, overdue included — committed money passes the month's last day, reminders pass
  nothing (all unpaid).
- `tontines.reminders.planTontineReminders` (pure), per tontine: one grouped nudge for
  its overdue contributions at the next 09:00 (re-planned every app open, so daily until
  paid); for its **next** contribution only, a heads-up at 09:00 `DUE_SOON_DAYS` before
  and a reminder at 09:00 on the day. Later cycles wait until they are next.
- `reconcileTontineReminders` cancels only `tontineDue` notifications, schedules fresh,
  and returns `{ soon, overdue }`. The root `TontineReminderScheduler` publishes that to
  `AttentionProvider` under `ATTENTION_TONTINES` — the drawer row's dot — on mount, on
  `tontines.events` change (every service write notifies), and on app foreground.
- The notification payload is built by `notifications/triggers/tontineDue`, which takes a
  plain input shape so `notifications/` never imports the feature.

## Module Map
| File | Job |
| --- | --- |
| `tontines.types.ts` | Tontine, payment, cycle and summary types |
| `tontines.schedule.ts` | **Pure** `cycleDate`, `buildCycles`, `summarise` |
| `tontines.service.ts` | CRUD with validation, pay / payout / undo, list and detail |
| `tontines.hooks.ts` | `useTontines`, `useTontineDetail` (actions), `useTontineForm` |
| `TontinesScreen.tsx` / `TontineCard.tsx` | The list (`/tontines`, drawer → Tontines) |
| `TontineDetail.tsx` / `TontineDetailRoute.tsx` / `CycleRow.tsx` / `PaymentSheet.tsx` | Detail (`/tontines/[id]`) |
| `TontineForm.tsx` / `TontineFormRoute.tsx` | Create (`/tontines/create`), edit (`/tontines/edit/[id]`) |
| `tontines.due.ts` | Unpaid contributions due by a date (reminders, committed money) |
| `tontines.reminders.ts` / `tontines.events.ts` / `TontineReminderScheduler.tsx` | Reminders and the drawer dot |
| `__fixtures__/tontines.fixtures.ts` | Shared screen-test data (outside `__tests__` so Jest does not run it) |
