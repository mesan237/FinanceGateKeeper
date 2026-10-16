-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-43 (edit and remove transfers)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 038.
-- ============================================================
--
-- Non-destructive and idempotent: it only adds one nullable column, so it is
-- safe on a project that already holds synced data and safe to run twice.
-- Patch 037 (the catch-up) already includes it.
--
-- Why "before": removing a transfer marks it pending, and Supabase rejects a
-- push naming a column it does not have
--   Could not find the 'deleted_at' column of 'transfers' in the schema cache
-- which fails the whole sync until the column exists.

alter table transfers add column if not exists deleted_at text;
