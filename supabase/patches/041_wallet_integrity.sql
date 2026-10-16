-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-42 (wallet integrity)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 037.
-- ============================================================
--
-- Non-destructive and idempotent: it adds two nullable columns and one new
-- table, so it is safe on a project that already holds synced data and safe to
-- run twice. Patch 037 (the catch-up) already includes it.
--
-- Why "before": the app pushes every column of a pending row, and Supabase
-- rejects a push naming a column or table it does not have
--   Could not find the 'account_id' column of 'recurring_expenses' in the schema cache
-- which fails the whole sync until it exists.

alter table quick_add_templates add column if not exists account_id text;
alter table recurring_expenses  add column if not exists account_id text;

create table if not exists balance_checks (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  account_id  text not null,     -- uuid of the wallet
  balance     integer not null,  -- what the wallet actually held at `date` (VS-42)
  difference  integer not null default 0,
  date        text not null,
  note        text,
  created_at  text not null,
  deleted_at  text,
  updated_at  text not null
);

alter table balance_checks enable row level security;
drop policy if exists balance_checks_owner on balance_checks;
create policy balance_checks_owner on balance_checks
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists balance_checks_updated_at_idx on balance_checks (user_id, updated_at);

notify pgrst, 'reload schema';
