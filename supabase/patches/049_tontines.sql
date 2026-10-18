-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-51 (tontines)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 045.
-- ============================================================
--
-- Non-destructive and idempotent: it only creates two new tables, so it is
-- safe on a project that already holds synced data and safe to run twice.
-- Patch 037 (the catch-up) already includes it.
--
-- Why "before": the first tontine the user saves is pushed, and Supabase
-- rejects a push to a table it does not have, which fails the whole sync.

create table if not exists tontines (
  uuid                 text primary key,
  user_id              uuid not null default auth.uid(),
  name                 text not null,
  contribution_amount  integer not null,
  frequency            text not null,   -- 'weekly' | 'monthly' (VS-51)
  start_date           text not null,
  members              integer not null,
  payout_turn          integer,         -- null until the draw settles it
  account_id           text,            -- uuid of the usual wallet, or null
  created_at           text not null,
  deleted_at           text,
  updated_at           text not null
);

create table if not exists tontine_payments (
  uuid         text primary key,
  user_id      uuid not null default auth.uid(),
  tontine_id   text not null,   -- uuid of the tontine
  kind         text not null,   -- 'contribution' | 'payout'
  cycle        integer not null,
  amount       integer not null,
  account_id   text,            -- uuid of the wallet, or null
  date         text not null,
  created_at   text not null,
  deleted_at   text,
  updated_at   text not null
);

alter table tontines enable row level security;
drop policy if exists tontines_owner on tontines;
create policy tontines_owner on tontines
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists tontines_updated_at_idx on tontines (user_id, updated_at);

alter table tontine_payments enable row level security;
drop policy if exists tontine_payments_owner on tontine_payments;
create policy tontine_payments_owner on tontine_payments
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists tontine_payments_updated_at_idx on tontine_payments (user_id, updated_at);

notify pgrst, 'reload schema';
