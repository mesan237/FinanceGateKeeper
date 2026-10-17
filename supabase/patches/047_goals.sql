-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-48 (goals)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 043.
-- ============================================================
--
-- Non-destructive and idempotent: it only creates one new table, so it is safe
-- on a project that already holds synced data and safe to run twice. Patch 037
-- (the catch-up) already includes it.
--
-- Why "before": the first goal the user saves is pushed, and Supabase rejects
-- a push to a table it does not have, which fails the whole sync.

create table if not exists goals (
  uuid            text primary key,
  user_id         uuid not null default auth.uid(),
  name            text not null,
  kind            text not null,   -- 'buffer' | 'sinking' (VS-48)
  target_amount   integer not null,
  target_date     text,            -- required for a sinking fund
  account_id      text not null,   -- uuid of the wallet holding the goal's money
  monthly_amount  integer not null default 0,
  created_at      text not null,
  deleted_at      text,
  updated_at      text not null
);

alter table goals enable row level security;
drop policy if exists goals_owner on goals;
create policy goals_owner on goals
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists goals_updated_at_idx on goals (user_id, updated_at);

notify pgrst, 'reload schema';
