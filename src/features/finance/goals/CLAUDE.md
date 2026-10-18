# Goals Feature Context

## Domain Responsibility
Saving goals (VS-48, Phase 4): a **starter buffer** (a cushion for surprises), an
**emergency reserve** sized in months of essential spending (VS-50), and **sinking
funds** (a known cost on a date — school fees, rent, a phone). Several can run at once.

## The one rule: a goal's money is a real wallet
Each goal links to one wallet, and **its progress is that wallet's live balance**
(`accounts.getAccountBalance`). Nothing about progress is stored. Saving is a transfer
into the wallet; spending from it lowers the goal. This is the user's decision
(2026-10-17) and the reason the parked `funds` design was not revived: its deposits
touched no wallet, so goal figures drifted from the money.

- **One live goal per wallet.** Two goals on one wallet would count the same balance
  twice. The service refuses it; deleting a goal frees the wallet.
- Hidden wallets cannot hold a goal.
- A negative balance counts as nothing saved.

## Database Tables
- `goals` — id, name, kind (`buffer` | `reserve` | `sinking`), target_amount (> 0),
  target_date (required for `sinking`, NULL otherwise), account_id (NOT NULL),
  monthly_amount (≥ 0), target_months (1–12, `reserve` only), created_at, deleted_at.
  Synced (migration 043, Supabase patch 047; reserve: migration 044 rebuilt the table
  to widen the kind CHECK, keeping ids, uuids and sync state; Supabase patch 048).
- **Soft delete only.** The sync engine never sends deletions, so a hard delete would
  come back on restore.

## Business Rules
- **Sinking fund pace** (`goals.progress`): `monthsLeft` counts this month up to, not
  including, the target month (money saved in the month it is needed is usually too
  late), at least 1 while the date is ahead, 0 once it has passed.
  `requiredMonthly = ceil(remaining / monthsLeft)`; once the date passes, everything
  still missing is required. `onPace` compares the planned `monthly_amount` with it.
- **Emergency reserve** (VS-50, `goals.reserve`): the user picks months (the form offers
  3–6, the table allows 1–12); target = months × one month of essentials. Essentials =
  the observed fixed average over complete months (`expenses.getObservedFixedAverage`,
  same rule as the typical month) when positive, else the `monthly_essentials`
  estimate. No figure → the reserve cannot be created and the form links to Estimates.
  `target_amount` stores the last size; `getGoals` re-sizes it from today's essentials,
  so the reserve follows real spending. Provisional below 3 complete months.
- **Buffer (and reserve) pace:** no date, so `monthsToTarget = ceil(remaining / monthly_amount)`,
  or none without a monthly amount.
- **Saved this month** = net transfers into the wallet dated this month.
- **Suggestions, never defaults:** one month of essentials (the VS-46
  `monthly_essentials` estimate, read from `baseline_facts` by SQL so `goals` does not
  import `budget`) as a buffer target; the required monthly amount for a sinking fund.

## Dependencies
- `goals` → `accounts`: `getAccountBalance` (progress), `AccountPicker` and
  `useAccounts` (the form).
- `goals` → `expenses`: `getObservedFixedAverage` (reserve sizing, VS-50). "Save now" navigates to `/transfers/log?to=<wallet>` by
  path, so no accounts screen is imported.
- Nothing imports `goals`. `budget` reads the `goals` table by SQL (VS-49): monthly
  amounts are set aside before the envelopes, and goal-wallet cash is left out of
  safe-to-spend. A reached goal keeps its monthly amount until edited; its card says so.

## Module Map
| File | Job |
| --- | --- |
| `goals.types.ts` | Goal, input and derived-progress types |
| `goals.progress.ts` | **Pure** pace math: `monthsLeft`, `goalProgress` |
| `goals.service.ts` | CRUD with validation, list with progress (reserves re-sized live) |
| `goals.reserve.ts` | Essentials estimate and `getEssentialMonthly` (observed, else estimate) |
| `goals.hooks.ts` | `useGoals` (list), `useGoalForm` (form state + suggestions) |
| `GoalsScreen.tsx` / `GoalCard.tsx` | The list (`/goals`, drawer → Goals) |
| `GoalForm.tsx` / `GoalFormRoute.tsx` | Create (`/goals/create`) and edit (`/goals/[id]`) |
| `ReserveSizeField.tsx` | Months picker, live size and its basis for a reserve |
