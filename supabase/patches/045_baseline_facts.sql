-- ============================================================
-- Finance Gatekeeper — Supabase patch for VS-46 (baseline and estimates)
-- Paste into the Supabase SQL editor and run BEFORE installing an app build
-- that contains migration 041.
-- ============================================================
--
-- Non-destructive and idempotent: it only creates one new table, so it is safe
-- on a project that already holds synced data and safe to run twice. Patch 037
-- (the catch-up) already includes it.
--
-- Why "before": the first estimate the user saves is pushed, and Supabase
-- rejects a push to a table it does not have, which fails the whole sync.

create table if not exists baseline_facts (
  uuid        text primary key,
  user_id     uuid not null default auth.uid(),
  kind        text not null,     -- monthly_income, income_regular, pay_day, ... (VS-46)
  value       integer not null,
  source      text not null default 'user',  -- 'user' typed it, 'observed' accepted from logged months
  created_at  text not null,
  updated_at  text not null
);

alter table baseline_facts enable row level security;
drop policy if exists baseline_facts_owner on baseline_facts;
create policy baseline_facts_owner on baseline_facts
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists baseline_facts_updated_at_idx on baseline_facts (user_id, updated_at);

notify pgrst, 'reload schema';
