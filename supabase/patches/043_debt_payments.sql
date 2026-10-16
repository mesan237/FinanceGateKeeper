-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-44 (debts that move money)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 039.
-- ============================================================
--
-- Non-destructive and idempotent: two nullable columns on debts and one new
-- table, so it is safe on a project that already holds synced data and safe to
-- run twice. Patch 037 (the catch-up) already includes it.
--
-- Why "before": the app pushes every column of a pending row, and Supabase
-- rejects a push naming a column or table it does not have
--   Could not find the 'account_id' column of 'debts' in the schema cache
-- which fails the whole sync until it exists.

alter table debts add column if not exists account_id text;
alter table debts add column if not exists deleted_at text;

create table if not exists debt_payments (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  debt_id     text not null,     -- uuid of the debt (VS-44)
  amount      integer not null,
  account_id  text,              -- uuid of the wallet it went through, or null
  date        text not null,
  note        text,
  created_at  text not null,
  deleted_at  text,
  updated_at  text not null
);

alter table debt_payments enable row level security;
drop policy if exists debt_payments_owner on debt_payments;
create policy debt_payments_owner on debt_payments
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists debt_payments_updated_at_idx on debt_payments (user_id, updated_at);

notify pgrst, 'reload schema';
