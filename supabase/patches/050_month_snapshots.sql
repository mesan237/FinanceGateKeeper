-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-53 (net worth history)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 046.
-- ============================================================
--
-- Non-destructive and idempotent: it only creates one new table, so it is safe
-- on a project that already holds synced data and safe to run twice. Patch 037
-- (the catch-up) already includes it.
--
-- Why "before": the app snapshots every closed month on its first open and
-- pushes them; Supabase rejects a push to a table it does not have, which fails
-- the whole sync.

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

alter table month_snapshots enable row level security;
drop policy if exists month_snapshots_owner on month_snapshots;
create policy month_snapshots_owner on month_snapshots
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists month_snapshots_updated_at_idx on month_snapshots (user_id, updated_at);

notify pgrst, 'reload schema';
