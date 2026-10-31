-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-91 (income sources)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 051.
-- ============================================================
--
-- Non-destructive and idempotent: it creates one table, adds one column, relaxes
-- one NOT NULL and adds a trigger, so it is safe on a project that already holds
-- synced data and safe to run twice. Patch 037 (the catch-up) already includes it.
--
-- What changes: income no longer carries a fixed text tag (`source`: salary |
-- freelance | ecommerce) but points at a row of `income_sources` (`source_id`,
-- the source's uuid). The built-in sources have fixed uuids
-- ('seed-income-source-<key>'), so an old tag maps straight to one:
--   * rows already in the cloud get their `source_id` filled in below;
--   * a phone still on an older build keeps pushing `source` only, and the
--     trigger fills `source_id` on the way in.
-- `source` stays (nullable) for those older builds; new builds leave it empty.
--
-- Why "before": the first source the user adds, or the first income saved by
-- the new build, is pushed, and Supabase rejects a push to a table or column it
-- does not have, which fails the whole sync.

create table if not exists income_sources (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  key         text,            -- salary | freelance | business | gift | other | ecommerce; null = the user's own
  name        text not null,
  parent_id   text,            -- uuid of the parent source, or null (one level deep)
  is_hidden   integer not null default 0,
  sort_order  integer not null default 0,
  created_at  text not null,
  updated_at  text not null
);

alter table income add column if not exists source_id text;  -- uuid of the income source (VS-91)
alter table income alter column source drop not null;

create or replace function income_source_id_from_tag() returns trigger
  language plpgsql as $$
begin
  if new.source_id is null and new.source is not null then
    new.source_id := 'seed-income-source-' || new.source;
  end if;
  return new;
end $$;

drop trigger if exists income_source_id_from_tag on income;
create trigger income_source_id_from_tag
  before insert or update on income
  for each row execute function income_source_id_from_tag();

update income set source_id = 'seed-income-source-' || source
  where source_id is null and source is not null;

alter table income_sources enable row level security;
drop policy if exists income_sources_owner on income_sources;
create policy income_sources_owner on income_sources
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists income_sources_updated_at_idx on income_sources (user_id, updated_at);

notify pgrst, 'reload schema';
