-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-47 (cash-flow budgeting)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 042.
-- ============================================================
--
-- Non-destructive and idempotent: it only adds one nullable column, so it is
-- safe on a project that already holds synced data and safe to run twice.
-- Patch 037 (the catch-up) already includes it.
--
-- surplus_seen records how much income above the month's budget the user chose
-- to leave unbudgeted, so the "give it a job" prompt stays quiet until more
-- arrives. Supabase rejects a push naming a column it does not have
--   Could not find the 'surplus_seen' column of 'allocations' in the schema cache
-- which fails the whole sync until the column exists.

alter table allocations add column if not exists surplus_seen integer;

notify pgrst, 'reload schema';
