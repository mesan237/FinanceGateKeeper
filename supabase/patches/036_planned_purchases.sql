-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-36 (planned purchases)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 031.
-- ============================================================
--
-- Non-destructive and idempotent: it only creates what is missing, so it is safe
-- to run on a project that already holds synced data (unlike schema.sql, which
-- drops and recreates every table) and safe to run twice.
--
-- Why "before": the app's sync pushes every table in SYNCED_TABLES and treats a
-- Supabase error as a failed sync. A build that knows about planned_lists /
-- planned_items but talks to a project without them fails every sync until these
-- tables exist.
--
-- Same model as schema.sql: uuid-keyed, foreign keys stored as the referenced
-- row's uuid (text), user_id defaulting to auth.uid(), updated_at written by the
-- client, owner-only row-level security.

create table if not exists planned_lists (
  uuid       text primary key,
  user_id    uuid not null default auth.uid(),
  name       text not null,
  created_at text not null,
  updated_at text not null
);

create table if not exists planned_items (
  uuid             text primary key,
  user_id          uuid not null default auth.uid(),
  list_id          text not null,   -- uuid of the planned list
  name             text not null,
  estimated_amount integer not null,
  category_id      text not null,   -- uuid of the category
  account_id       text,            -- uuid of the account, or null
  planned_date     text,
  expense_id       text,            -- uuid of the expense that bought it, or null
  created_at       text not null,
  updated_at       text not null
);

do $$
declare t text;
begin
  foreach t in array array['planned_lists','planned_items']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %1$I_owner on %1$I;', t);
    execute format($f$
      create policy %1$I_owner on %1$I
        for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid());
    $f$, t);
    execute format('create index if not exists %1$I_updated_at_idx on %1$I (user_id, updated_at);', t);
  end loop;
end $$;
