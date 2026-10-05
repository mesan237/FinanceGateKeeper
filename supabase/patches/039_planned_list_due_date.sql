-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-39 (planned list due dates)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 033.
-- ============================================================
--
-- Non-destructive and idempotent: it only adds the missing column, so it is
-- safe on a project that already holds synced data and safe to run twice.
-- Patch 037 (the catch-up) already includes it.
--
-- Why "before": the app pushes every column of a pending planned list, and
-- Supabase rejects a push naming a column it does not have
--   Could not find the 'due_date' column of 'planned_lists' in the schema cache
-- which fails the whole sync until the column exists.
--
-- Nullable on purpose: lists created before VS-39 have no due date.

alter table planned_lists add column if not exists due_date text;
