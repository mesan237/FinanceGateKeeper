-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-61 (events)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 049.
-- ============================================================
--
-- Non-destructive and idempotent: it creates one new table and adds one column,
-- so it is safe on a project that already holds synced data and safe to run
-- twice. Patch 037 (the catch-up) already includes it.
--
-- Why "before": the first event the user saves, or the first expense tagged with
-- one, is pushed, and Supabase rejects a push to a table or column it does not
-- have, which fails the whole sync.

create table if not exists events (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  name        text not null,
  date        text,            -- YYYY-MM-DD, or null (VS-61)
  created_at  text not null,
  deleted_at  text,
  updated_at  text not null
);

alter table expenses add column if not exists event_id text;  -- uuid of the event, or null

alter table events enable row level security;
drop policy if exists events_owner on events;
create policy events_owner on events
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists events_updated_at_idx on events (user_id, updated_at);

notify pgrst, 'reload schema';
