-- ============================================================
-- Finance Gatekeeper — Supabase patch: catch the cloud schema up
-- Paste this entire file into the Supabase SQL editor and run.
-- ============================================================
--
-- Non-destructive and idempotent: brings a cloud project in ANY earlier state —
-- empty, partially set up, or created from an older schema.sql — up to the
-- current schema.sql without dropping anything, and is safe to run twice.
-- It includes everything patch 036 does, so a project that never ran 036 only
-- needs this one.
--
-- Why it exists: schema.sql was not updated when migrations 018–023 added
-- synced tables and columns, so every project set up from it rejects the
-- app's pushes with
--   Could not find the '<column>' column of '<table>' in the schema cache
-- and a sync error on any one table fails the whole sync.
--
--   1. Refuses to run if a table from the pre-VS-15 integer-id schema is still
--      there (no `uuid` column): that layout cannot be upgraded in place — run
--      schema.sql instead, which drops and recreates it.
--   2. Creates every missing table (same definitions as schema.sql).
--   3. Adds the columns later migrations introduced to tables that already
--      existed (account_id 019, allocation_status 022, projects.deleted_at 023,
--      total_budget 027, expenses.is_unplanned 032,
--      planned_lists.due_date 033).
--   4. Applies owner-only RLS and the pull-cursor index to every table.

-- ----------------------------------------------------------------
-- 1. Guard against the old integer-id tables.
-- ----------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'funds', 'projects', 'accounts', 'expenses',
    'income', 'allocations', 'category_budgets', 'fund_transactions', 'project_transactions',
    'quick_add_templates', 'recurring_expenses', 'zero_days', 'debts', 'planned_lists',
    'planned_items', 'transfers'
  ]
  loop
    if to_regclass('public.' || t) is not null and not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'uuid'
    ) then
      raise exception 'Table % uses the old integer-id layout (no uuid column). Run supabase/schema.sql instead.', t;
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------
-- 2. Create missing tables (parents before children).
-- ----------------------------------------------------------------
create table if not exists categories (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  name        text not null,
  parent_id   text,            -- uuid of the parent category, or null
  is_default  integer not null default 0,
  sort_order  integer not null default 0,
  is_hidden   integer not null default 0,
  updated_at  text not null
);

create table if not exists funds (
  uuid          text primary key,
  user_id       uuid not null default auth.uid(),
  type          text not null,
  target_amount integer,
  current_amount integer not null default 0,
  is_target_met integer not null default 0,
  created_at    text not null,
  updated_at    text not null
);

create table if not exists projects (
  uuid          text primary key,
  user_id       uuid not null default auth.uid(),
  name          text not null,
  target_amount integer not null,
  funded_amount integer not null default 0,
  priority_rank integer not null,
  deadline      text,
  status        text not null default 'active',
  deleted_at    text,           -- soft-delete timestamp, or null (migration 023)
  created_at    text not null,
  updated_at    text not null
);

create table if not exists accounts (
  uuid            text primary key,
  user_id         uuid not null default auth.uid(),
  name            text not null,
  type            text not null,
  purpose         text not null,
  opening_balance integer not null default 0,
  is_default      integer not null default 0,
  is_active       integer not null default 1,
  created_at      text not null,
  updated_at      text not null
);

create table if not exists expenses (
  uuid           text primary key,
  user_id        uuid not null default auth.uid(),
  amount         integer not null,
  category_id    text,          -- uuid of the category
  subcategory_id text,          -- uuid of the subcategory, or null
  note           text,
  date           text not null,
  is_recurring   integer not null default 0,
  account_id     text,          -- uuid of the account, or null
  is_unplanned   integer not null default 0,  -- the "imprévu" flag (VS-38)
  created_at     text not null,
  updated_at     text not null
);

create table if not exists income (
  uuid              text primary key,
  user_id           uuid not null default auth.uid(),
  amount            integer not null,
  source            text not null,
  note              text,
  date              text not null,
  allocation_status text not null default 'allocated',
  account_id        text,       -- uuid of the account, or null
  created_at        text not null,
  updated_at        text not null
);

create table if not exists allocations (
  uuid               text primary key,
  user_id            uuid not null default auth.uid(),
  month              text not null,
  emergency_fund_pct integer not null,
  savings_pct        integer not null,
  projects_pct       integer not null,
  expenses_pct       integer not null,
  priority_order     text not null,
  is_locked          integer not null default 0,
  -- Explicit spendable total for the month. NULL = derive from the income split
  -- (allocated income x expenses_pct), which is what every pre-VS-33 month does.
  total_budget       integer,
  created_at         text not null,
  updated_at         text not null
);

create table if not exists category_budgets (
  uuid             text primary key,
  user_id          uuid not null default auth.uid(),
  month            text not null,
  category_id      text not null,   -- uuid of the category
  allocated_amount integer not null,
  rollover_enabled integer not null default 0,
  created_at       text not null,
  updated_at       text not null
);

create table if not exists fund_transactions (
  uuid       text primary key,
  user_id    uuid not null default auth.uid(),
  fund_id    text not null,      -- uuid of the fund
  amount     integer not null,
  direction  text not null,
  reason     text,
  date       text not null,
  account_id text,               -- uuid of the account, or null
  created_at text not null,
  updated_at text not null
);

create table if not exists project_transactions (
  uuid       text primary key,
  user_id    uuid not null default auth.uid(),
  project_id text not null,      -- uuid of the project
  amount     integer not null,
  date       text not null,
  source     text not null,
  account_id text,               -- uuid of the account, or null
  created_at text not null,
  updated_at text not null
);

create table if not exists quick_add_templates (
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

create table if not exists recurring_expenses (
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

create table if not exists zero_days (
  uuid         text primary key,
  user_id      uuid not null default auth.uid(),
  date         text not null,
  confirmed_at text not null,
  updated_at   text not null
);

create table if not exists debts (
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

create table if not exists planned_lists (
  uuid       text primary key,
  user_id    uuid not null default auth.uid(),
  name       text not null,
  due_date   text,             -- the shopping day (VS-39), or null on older lists
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

create table if not exists transfers (
  uuid            text primary key,
  user_id         uuid not null default auth.uid(),
  from_account_id text not null,  -- uuid of the source account
  to_account_id   text not null,  -- uuid of the destination account
  amount          integer not null,
  date            text not null,
  note            text,
  created_at      text not null,
  updated_at      text not null
);

-- ----------------------------------------------------------------
-- 3. Columns added after these tables first shipped.
-- ----------------------------------------------------------------
alter table projects             add column if not exists deleted_at text;
alter table expenses             add column if not exists account_id text;
alter table expenses             add column if not exists is_unplanned integer not null default 0;
alter table income               add column if not exists account_id text;
alter table income               add column if not exists allocation_status text not null default 'allocated';
alter table allocations          add column if not exists total_budget integer;
alter table fund_transactions    add column if not exists account_id text;
alter table project_transactions add column if not exists account_id text;
alter table planned_lists        add column if not exists due_date text;

-- ----------------------------------------------------------------
-- 4. Owner-only RLS and the pull-cursor index (same as schema.sql).
-- ----------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'funds', 'projects', 'accounts', 'expenses',
    'income', 'allocations', 'category_budgets', 'fund_transactions', 'project_transactions',
    'quick_add_templates', 'recurring_expenses', 'zero_days', 'debts', 'planned_lists',
    'planned_items', 'transfers'
  ]
  loop
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

-- Make PostgREST pick up the new tables/columns right away.
notify pgrst, 'reload schema';
