-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-41 (fixed or variable categories)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 036.
-- ============================================================
--
-- Non-destructive and idempotent: it only adds the missing column, so it is
-- safe on a project that already holds synced data and safe to run twice.
-- Patch 037 (the catch-up) already includes it.
--
-- Why "before": migration 036 tags the default Bills category as fixed, which
-- marks it pending, and Supabase rejects a push naming a column it does not have
--   Could not find the 'cost_type' column of 'categories' in the schema cache
-- which fails the whole sync until the column exists.
--
-- Nullable on purpose: null on a parent reads as variable, null on a
-- subcategory inherits its parent.

alter table categories add column if not exists cost_type text;
