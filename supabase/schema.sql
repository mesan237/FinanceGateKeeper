-- ============================================================
-- Finance Gatekeeper — Supabase Schema
-- Generated from SQLite migrations 001–014
-- Paste this entire file into the Supabase SQL Editor and run.
-- ============================================================

-- ----------------------------------------------------------------
-- Helper: auto-update updated_at on every write (used for sync pull)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------
-- 001 — categories
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT    NOT NULL,
  parent_id    BIGINT  REFERENCES categories(id),
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

CREATE OR REPLACE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON categories
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Seed default categories (idempotent via ON CONFLICT DO NOTHING)
WITH parent_inserts AS (
  INSERT INTO categories (name, is_default, sort_order) VALUES
    ('Food',          TRUE, 0),
    ('Transport',     TRUE, 1),
    ('Bills',         TRUE, 2),
    ('Health',        TRUE, 3),
    ('Entertainment', TRUE, 4),
    ('Education',     TRUE, 5),
    ('Shopping',      TRUE, 6),
    ('Other',         TRUE, 7)
  ON CONFLICT DO NOTHING
  RETURNING id, name
)
INSERT INTO categories (name, parent_id, is_default, sort_order)
SELECT sub.sub_name, p.id, TRUE, sub.sub_order
FROM parent_inserts p
JOIN (VALUES
  ('Food',          'Groceries',        0),
  ('Food',          'Restaurant',       1),
  ('Food',          'Snacks',           2),
  ('Transport',     'Taxi',             0),
  ('Transport',     'Fuel',             1),
  ('Transport',     'Public Transport', 2),
  ('Bills',         'Rent',             0),
  ('Bills',         'Electricity',      1),
  ('Bills',         'Water',            2),
  ('Bills',         'Internet',         3),
  ('Bills',         'Phone',            4),
  ('Health',        'Pharmacy',         0),
  ('Health',        'Doctor',           1),
  ('Entertainment', 'Streaming',        0),
  ('Entertainment', 'Outings',          1),
  ('Education',     'Books',            0),
  ('Education',     'Courses',          1),
  ('Shopping',      'Clothing',         0),
  ('Shopping',      'Household',        1),
  ('Other',         'Miscellaneous',    0)
) AS sub(parent_name, sub_name, sub_order) ON p.name = sub.parent_name
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- 002 + 003 — expenses (includes is_hidden from migration 003)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id              BIGSERIAL PRIMARY KEY,
  amount          BIGINT  NOT NULL,
  category_id     BIGINT  NOT NULL REFERENCES categories(id),
  subcategory_id  BIGINT  REFERENCES categories(id),
  note            TEXT,
  date            DATE    NOT NULL,
  is_recurring    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

CREATE OR REPLACE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON expenses
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 004 — income
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS income (
  id          BIGSERIAL PRIMARY KEY,
  amount      BIGINT NOT NULL,
  source      TEXT   NOT NULL CHECK(source IN ('salary', 'freelance', 'ecommerce')),
  note        TEXT,
  date        DATE   NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_date ON income(date);

CREATE OR REPLACE TRIGGER trg_income_updated_at
  BEFORE UPDATE ON income
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON income
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 005 — allocations
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocations (
  id                  BIGSERIAL PRIMARY KEY,
  month               TEXT    NOT NULL UNIQUE,   -- YYYY-MM
  emergency_fund_pct  INTEGER NOT NULL,
  savings_pct         INTEGER NOT NULL,
  projects_pct        INTEGER NOT NULL,
  expenses_pct        INTEGER NOT NULL,
  priority_order      TEXT    NOT NULL,           -- JSON-serialised Bucket[]
  is_locked           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allocations_month ON allocations(month);

CREATE OR REPLACE TRIGGER trg_allocations_updated_at
  BEFORE UPDATE ON allocations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON allocations
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 006 — quick_add_templates
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quick_add_templates (
  id              BIGSERIAL PRIMARY KEY,
  label           TEXT    NOT NULL,
  amount          BIGINT  NOT NULL,
  category_id     BIGINT  NOT NULL REFERENCES categories(id),
  subcategory_id  BIGINT  REFERENCES categories(id),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_quick_add_templates_updated_at
  BEFORE UPDATE ON quick_add_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE quick_add_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON quick_add_templates
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 007 — recurring_expenses
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id              BIGSERIAL PRIMARY KEY,
  label           TEXT    NOT NULL,
  amount          BIGINT  NOT NULL,
  category_id     BIGINT  NOT NULL REFERENCES categories(id),
  subcategory_id  BIGINT  REFERENCES categories(id),
  frequency       TEXT    NOT NULL CHECK(frequency IN ('monthly', 'weekly')),
  next_due_date   DATE    NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_active_due
  ON recurring_expenses(is_active, next_due_date);

CREATE OR REPLACE TRIGGER trg_recurring_expenses_updated_at
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON recurring_expenses
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 008 — users (app settings / single row)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                      BIGSERIAL PRIMARY KEY,
  pin_hash                TEXT,
  app_mode                TEXT    NOT NULL DEFAULT 'learning'
                            CHECK(app_mode IN ('learning', 'control')),
  reminder_time           TEXT    NOT NULL DEFAULT '21:00',
  notifications_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON users
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 009 — zero_days
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zero_days (
  id            BIGSERIAL PRIMARY KEY,
  date          DATE        NOT NULL UNIQUE,
  confirmed_at  TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_zero_days_updated_at
  BEFORE UPDATE ON zero_days
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE zero_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON zero_days
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 010 — funds
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funds (
  id              BIGSERIAL PRIMARY KEY,
  type            TEXT    NOT NULL UNIQUE CHECK(type IN ('emergency', 'savings')),
  target_amount   BIGINT,
  current_amount  BIGINT  NOT NULL DEFAULT 0,
  is_target_met   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER trg_funds_updated_at
  BEFORE UPDATE ON funds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON funds
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 011 — fund_transactions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fund_transactions (
  id          BIGSERIAL PRIMARY KEY,
  fund_id     BIGINT  NOT NULL REFERENCES funds(id),
  amount      BIGINT  NOT NULL,
  direction   TEXT    NOT NULL CHECK(direction IN ('deposit', 'withdrawal')),
  reason      TEXT,
  date        DATE    NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fund_transactions_fund_id ON fund_transactions(fund_id);

CREATE OR REPLACE TRIGGER trg_fund_transactions_updated_at
  BEFORE UPDATE ON fund_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE fund_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON fund_transactions
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 012 — projects
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT    NOT NULL,
  target_amount   BIGINT  NOT NULL,
  funded_amount   BIGINT  NOT NULL DEFAULT 0,
  priority_rank   INTEGER NOT NULL,
  deadline        DATE,
  status          TEXT    NOT NULL DEFAULT 'active'
                    CHECK(status IN ('active', 'completed', 'paused')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority_rank);

CREATE OR REPLACE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON projects
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 013 — project_transactions
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_transactions (
  id          BIGSERIAL PRIMARY KEY,
  project_id  BIGINT  NOT NULL REFERENCES projects(id),
  amount      BIGINT  NOT NULL,
  date        DATE    NOT NULL,
  source      TEXT    NOT NULL CHECK(source IN ('allocation', 'manual')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_transactions_project_id
  ON project_transactions(project_id);

CREATE OR REPLACE TRIGGER trg_project_transactions_updated_at
  BEFORE UPDATE ON project_transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE project_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON project_transactions
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- ----------------------------------------------------------------
-- 014 — debts
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS debts (
  id           BIGSERIAL PRIMARY KEY,
  person_name  TEXT    NOT NULL,
  amount       BIGINT  NOT NULL,
  direction    TEXT    NOT NULL CHECK(direction IN ('lent', 'owed')),
  date         DATE    NOT NULL,
  due_date     DATE,
  status       TEXT    NOT NULL DEFAULT 'pending'
                 CHECK(status IN ('pending', 'settled')),
  note         TEXT,
  settled_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debts_direction_status ON debts(direction, status);

CREATE OR REPLACE TRIGGER trg_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON debts
  FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
