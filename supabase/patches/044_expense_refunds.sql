-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-45 (refunds)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 040.
-- ============================================================
--
-- Non-destructive and idempotent: it only adds one nullable column, so it is
-- safe on a project that already holds synced data and safe to run twice.
-- Patch 037 (the catch-up) already includes it.
--
-- A refund is an expense row with a negative amount whose refund_of names the
-- purchase it refunds. Supabase rejects a push naming a column it does not have
--   Could not find the 'refund_of' column of 'expenses' in the schema cache
-- which fails the whole sync until the column exists.

alter table expenses add column if not exists refund_of text;
