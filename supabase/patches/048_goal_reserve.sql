-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-50 (emergency reserve)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 044.
-- ============================================================
--
-- Non-destructive and idempotent: it only adds one nullable column, so it is
-- safe on a project that already holds synced data and safe to run twice.
-- Patch 037 (the catch-up) already includes it. The new 'reserve' kind needs
-- nothing here: the cloud keeps `kind` as plain text.
--
-- Supabase rejects a push naming a column it does not have
--   Could not find the 'target_months' column of 'goals' in the schema cache
-- which fails the whole sync until the column exists.

alter table goals add column if not exists target_months integer;

notify pgrst, 'reload schema';
