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
--      planned_lists.due_date 033, categories.cost_type 036,
--      quick_add_templates/recurring_expenses.account_id 037,
--      transfers.deleted_at 038, debts.account_id/deleted_at 039,
--      expenses.refund_of 040, allocations.surplus_seen 042,
--      goals.target_months 044, debts terms and debt_payments.instalment 047,
--      expenses.event_id 049, income.source_id 051 — with the trigger and
--      backfill that map the old text tag to a built-in source).
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
    'planned_items', 'transfers', 'balance_checks', 'debt_payments', 'baseline_facts', 'goals',
    'tontines', 'tontine_payments', 'month_snapshots', 'events', 'income_sources'
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
  cost_type   text,            -- 'fixed' | 'variable', or null = variable / inherit (VS-41)
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
  event_id       text,           -- uuid of the event it was for, or null (VS-61)
  refund_of      text,           -- uuid of the expense this refunds; amount is negative (VS-45)
  created_at     text not null,
  updated_at     text not null
);

create table if not exists income_sources (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  key         text,            -- built-in key (salary, business, ...), or null = the user's own (VS-91)
  name        text not null,
  parent_id   text,            -- uuid of the parent source, or null (one level deep)
  is_hidden   integer not null default 0,
  sort_order  integer not null default 0,
  created_at  text not null,
  updated_at  text not null
);

create table if not exists income (
  uuid              text primary key,
  user_id           uuid not null default auth.uid(),
  amount            integer not null,
  source            text,       -- the pre-VS-91 tag; only older builds still send it
  source_id         text,       -- uuid of the income source (VS-91)
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
  -- Income above the budget the user chose to leave unbudgeted (VS-47).
  surplus_seen       integer,
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
  account_id     text,           -- uuid of the wallet it is paid from, or null (VS-42)
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
  account_id     text,           -- uuid of the wallet it is paid from, or null (VS-42)
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
  account_id  text,            -- uuid of the wallet the loan went through, or null (VS-44)
  deleted_at  text,            -- set when removed; removals sync, deletions do not
  created_at  text not null,
  total_to_repay        integer,   -- interest included; null = the amount (VS-54)
  instalment_count      integer,   -- equal instalments, or null
  instalment_frequency  text,      -- 'weekly' | 'monthly'
  first_instalment_date text,
  updated_at  text not null
);

create table if not exists debt_payments (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  debt_id     text not null,     -- uuid of the debt (VS-44)
  amount      integer not null,
  account_id  text,              -- uuid of the wallet it went through, or null
  date        text not null,
  note        text,
  created_at  text not null,
  deleted_at  text,
  instalment   integer,         -- which instalment it pays, or null (VS-54)
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
  deleted_at      text,           -- set when removed; removals sync, deletions do not (VS-43)
  updated_at      text not null
);

create table if not exists balance_checks (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  account_id  text not null,     -- uuid of the wallet
  balance     integer not null,  -- what the wallet actually held at `date` (VS-42)
  difference  integer not null default 0,
  date        text not null,
  note        text,
  created_at  text not null,
  deleted_at  text,
  updated_at  text not null
);

create table if not exists baseline_facts (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  kind        text not null,     -- monthly_income, income_regular, pay_day, ... (VS-46)
  value       integer not null,
  source      text not null default 'user',  -- 'user' typed it, 'observed' accepted from logged months
  created_at  text not null,
  updated_at  text not null
);

create table if not exists goals (
  uuid            text primary key,
  user_id         uuid not null default auth.uid(),
  name            text not null,
  kind            text not null,   -- 'buffer' | 'sinking' (VS-48) | 'reserve' (VS-50)
  target_amount   integer not null,
  target_date     text,            -- required for a sinking fund
  account_id      text not null,   -- uuid of the wallet holding the goal's money
  monthly_amount  integer not null default 0,
  created_at      text not null,
  deleted_at      text,
  target_months   integer,         -- months of essentials, reserves only (VS-50)
  updated_at      text not null
);

create table if not exists tontines (
  uuid                 text primary key,
  user_id              uuid not null default auth.uid(),
  name                 text not null,
  contribution_amount  integer not null,
  frequency            text not null,   -- 'weekly' | 'monthly' (VS-51)
  start_date           text not null,
  members              integer not null,
  payout_turn          integer,         -- null until the draw settles it
  account_id           text,            -- uuid of the usual wallet, or null
  created_at           text not null,
  deleted_at           text,
  updated_at           text not null
);

create table if not exists tontine_payments (
  uuid         text primary key,
  user_id      uuid not null default auth.uid(),
  tontine_id   text not null,   -- uuid of the tontine
  kind         text not null,   -- 'contribution' | 'payout'
  cycle        integer not null,
  amount       integer not null,
  account_id   text,            -- uuid of the wallet, or null
  date         text not null,
  created_at   text not null,
  deleted_at   text,
  updated_at   text not null
);

create table if not exists events (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  name        text not null,
  date        text,            -- YYYY-MM-DD, or null (VS-61)
  created_at  text not null,
  deleted_at  text,
  updated_at  text not null
);

create table if not exists month_snapshots (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  month       text not null,       -- YYYY-MM; append-only, latest per month wins (VS-53)
  wallets     integer not null,
  lent        integer not null,
  owed        integer not null,
  tontines    integer not null,
  net_worth   integer not null,
  income      integer not null,
  spending    integer not null,
  created_at  text not null,
  updated_at  text not null
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
alter table allocations          add column if not exists surplus_seen integer;
alter table fund_transactions    add column if not exists account_id text;
alter table project_transactions add column if not exists account_id text;
alter table planned_lists        add column if not exists due_date text;
alter table categories           add column if not exists cost_type text;
alter table quick_add_templates  add column if not exists account_id text;
alter table recurring_expenses   add column if not exists account_id text;
alter table transfers            add column if not exists deleted_at text;
alter table debts                add column if not exists account_id text;
alter table debts                add column if not exists deleted_at text;
alter table expenses             add column if not exists refund_of text;
alter table goals                add column if not exists target_months integer;
alter table debts                add column if not exists total_to_repay integer;
alter table debts                add column if not exists instalment_count integer;
alter table debts                add column if not exists instalment_frequency text;
alter table debts                add column if not exists first_instalment_date text;
alter table debt_payments        add column if not exists instalment integer;
alter table expenses             add column if not exists event_id text;
alter table income               add column if not exists source_id text;
alter table income               alter column source drop not null;

-- ----------------------------------------------------------------
-- Income from older builds (VS-91): a phone that still pushes the old text tag
-- (`source`) gets the matching built-in source's uuid in `source_id`.
-- ----------------------------------------------------------------
create or replace function income_source_id_from_tag() returns trigger
  language plpgsql as $
begin
  if new.source_id is null and new.source is not null then
    new.source_id := 'seed-income-source-' || new.source;
  end if;
  return new;
end $;

drop trigger if exists income_source_id_from_tag on income;
create trigger income_source_id_from_tag
  before insert or update on income
  for each row execute function income_source_id_from_tag();

update income set source_id = 'seed-income-source-' || source
  where source_id is null and source is not null;

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
    'planned_items', 'transfers', 'balance_checks', 'debt_payments', 'baseline_facts', 'goals',
    'tontines', 'tontine_payments', 'month_snapshots', 'events', 'income_sources'
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
