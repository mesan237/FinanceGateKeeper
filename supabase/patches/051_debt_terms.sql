-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-54 (debt terms)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 047.
-- ============================================================
--
-- Non-destructive and idempotent: it only adds nullable columns, so it is safe
-- on a project that already holds synced data and safe to run twice. Patch 037
-- (the catch-up) already includes it.
--
-- Supabase rejects a push naming a column it does not have
--   Could not find the 'total_to_repay' column of 'debts' in the schema cache
-- which fails the whole sync until the columns exist.

alter table debts                add column if not exists total_to_repay integer;
alter table debts                add column if not exists instalment_count integer;
alter table debts                add column if not exists instalment_frequency text;
alter table debts                add column if not exists first_instalment_date text;
alter table debt_payments        add column if not exists instalment integer;

notify pgrst, 'reload schema';
