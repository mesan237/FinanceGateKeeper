-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-38 (imprévus)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 032.
-- ============================================================
--
-- Non-destructive and idempotent: it only adds the missing column, so it is
-- safe on a project that already holds synced data and safe to run twice.
-- Patch 037 (the catch-up) already includes it, so a project that runs 037
-- after this change does not need this file as well.
--
-- Why "before": the app pushes every column of a pending expense, and Supabase
-- rejects a push naming a column it does not have
--   Could not find the 'is_unplanned' column of 'expenses' in the schema cache
-- which fails the whole sync until the column exists.

alter table expenses add column if not exists is_unplanned integer not null default 0;
