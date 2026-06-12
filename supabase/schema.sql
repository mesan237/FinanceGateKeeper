-- ============================================================
-- Finance Gatekeeper — Supabase cloud schema (VS-15)
-- Paste this entire file into the Supabase SQL editor and run.
-- ============================================================
--
-- This file SUPERSEDES the earlier integer-id schema. The VS-15 sync engine
-- (src/services/sync.ts) keys every cloud row on the portable `uuid` the client
-- generates — the local SQLite integer `id` is device-specific and is NEVER sent
-- to the cloud. The block below DROPs the old, incompatible tables and recreates
-- them uuid-keyed.
--
-- ⚠️  DESTRUCTIVE: the DROP statements delete the listed tables and their data.
--     Safe during first-time setup (the tables are empty). Do NOT run this over a
--     project that already holds real synced data.
--
-- Model:
--   * Each table mirrors a local SQLite table (see src/services/migrations/),
--     keyed by `uuid` (text, primary key). The client upserts with
--     onConflict: 'uuid' and pulls with select().gt('updated_at', cursor).
--   * Foreign keys are stored as the referenced row's `uuid` (text), not an
--     integer id, so relationships survive a restore onto a new device.
--   * `user_id` defaults to auth.uid(); every table has an owner-only RLS policy.
--     The client never sends `user_id` — the default fills it on insert.
--   * `updated_at` is written by the CLIENT (last-write-wins). There is no
--     server-side updated_at trigger: a trigger would overwrite the client's
--     timestamp and break the pull's newer-than comparison.
--   * `users` is intentionally absent — settings/PIN state stays on the device.
--
-- Single-user assumption: built for one account. `uuid` is globally unique; the
-- default category tree uses deterministic uuids ('seed-category-<id>') that are
-- stable per install and expected to belong to a single account.

-- ----------------------------------------------------------------
-- Reset: drop the stale integer-id tables (and the old updated_at helper).
-- ----------------------------------------------------------------
drop table if exists
  categories, funds, projects, expenses, income, allocations,
  fund_transactions, project_transactions, quick_add_templates,
  recurring_expenses, zero_days, debts, users
  cascade;

drop function if exists set_updated_at() cascade;

-- ----------------------------------------------------------------
-- Tables (uuid-keyed, parents before children)
-- ----------------------------------------------------------------
create table categories (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  name        text not null,
  parent_id   text,            -- uuid of the parent category, or null
  is_default  integer not null default 0,
  sort_order  integer not null default 0,
  is_hidden   integer not null default 0,
  updated_at  text not null
);

create table funds (
  uuid          text primary key,
  user_id       uuid not null default auth.uid(),
  type          text not null,
  target_amount integer,
  current_amount integer not null default 0,
  is_target_met integer not null default 0,
  created_at    text not null,
  updated_at    text not null
);

create table projects (
  uuid          text primary key,
  user_id       uuid not null default auth.uid(),
  name          text not null,
  target_amount integer not null,
  funded_amount integer not null default 0,
  priority_rank integer not null,
  deadline      text,
  status        text not null default 'active',
  created_at    text not null,
  updated_at    text not null
);

create table expenses (
  uuid           text primary key,
  user_id        uuid not null default auth.uid(),
  amount         integer not null,
  category_id    text,          -- uuid of the category
  subcategory_id text,          -- uuid of the subcategory, or null
  note           text,
  date           text not null,
  is_recurring   integer not null default 0,
  created_at     text not null,
  updated_at     text not null
);

create table income (
  uuid              text primary key,
  user_id           uuid not null default auth.uid(),
  amount            integer not null,
  source            text not null,
  note              text,
  date              text not null,
  allocation_status text not null default 'allocated',
  created_at        text not null,
  updated_at        text not null
);

create table allocations (
  uuid               text primary key,
  user_id            uuid not null default auth.uid(),
  month              text not null,
  emergency_fund_pct integer not null,
  savings_pct        integer not null,
  projects_pct       integer not null,
  expenses_pct       integer not null,
  priority_order     text not null,
  is_locked          integer not null default 0,
  created_at         text not null,
  updated_at         text not null
);

create table fund_transactions (
  uuid       text primary key,
  user_id    uuid not null default auth.uid(),
  fund_id    text not null,      -- uuid of the fund
  amount     integer not null,
  direction  text not null,
  reason     text,
  date       text not null,
  created_at text not null,
  updated_at text not null
);

create table project_transactions (
  uuid       text primary key,
  user_id    uuid not null default auth.uid(),
  project_id text not null,      -- uuid of the project
  amount     integer not null,
  date       text not null,
  source     text not null,
  created_at text not null,
  updated_at text not null
);

create table quick_add_templates (
  uuid           text primary key,
  user_id        uuid not null default auth.uid(),
  label          text not null,
  amount         integer not null,
  category_id    text,           -- uuid of the category
  subcategory_id text,           -- uuid of the subcategory, or null
  sort_order     integer not null default 0,
  created_at     text not null,
  updated_at     text not null
);

create table recurring_expenses (
  uuid           text primary key,
  user_id        uuid not null default auth.uid(),
  label          text not null,
  amount         integer not null,
  category_id    text,           -- uuid of the category
  subcategory_id text,           -- uuid of the subcategory, or null
  frequency      text not null,
  next_due_date  text not null,
  is_active      integer not null default 1,
  created_at     text not null,
  updated_at     text not null
);

create table zero_days (
  uuid         text primary key,
  user_id      uuid not null default auth.uid(),
  date         text not null,
  confirmed_at text not null,
  updated_at   text not null
);

create table debts (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  person_name text not null,
  amount      integer not null,
  direction   text not null,
  date        text not null,
  due_date    text,
  status      text not null default 'pending',
  note        text,
  settled_at  text,
  created_at  text not null,
  updated_at  text not null
);

-- ----------------------------------------------------------------
-- Row-level security: each table is readable/writable only by its owner,
-- plus an index backing the pull cursor (user_id, updated_at).
-- ----------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'categories','funds','projects','expenses','income','allocations',
    'fund_transactions','project_transactions','quick_add_templates',
    'recurring_expenses','zero_days','debts'
  ]
  loop
    -- Defensive: ensure user_id exists even if an older table predates this run.
    execute format('alter table %I add column if not exists user_id uuid not null default auth.uid();', t);
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
