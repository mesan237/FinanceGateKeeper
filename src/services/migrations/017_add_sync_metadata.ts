import type { Migration, SqliteDriver } from '@/services/database';

/**
 * Tables that participate in cloud sync, listed parents-first so a pull can
 * insert referenced rows before the rows that point at them (see
 * `@/services/sync`). The single-row `users` table is deliberately excluded —
 * it holds device/settings state (PIN hash, app mode, reminder prefs, first-run
 * timestamp), not financial data, so it never leaves the device.
 */
export const SYNCED_TABLES = [
  'categories',
  'funds',
  'projects',
  'accounts',
  'expenses',
  'income',
  'allocations',
  'category_budgets',
  'fund_transactions',
  'project_transactions',
  'quick_add_templates',
  'recurring_expenses',
  'zero_days',
  'debts',
  'transfers',
  'planned_lists',
  'planned_items',
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

// `accounts`, `transfers`, `category_budgets` and the planned-purchases tables
// are created by later migrations (018/020/026/030), so this migration cannot
// provision their sync columns — migrations 021, 028 and 031 do that. This
// migration only touches the tables that already exist when it runs.
const PROVISIONED_LATER: ReadonlyArray<string> = [
  'accounts',
  'transfers',
  'category_budgets',
  'planned_lists',
  'planned_items',
];

const TABLES_PROVISIONED_HERE: ReadonlyArray<SyncedTable> = SYNCED_TABLES.filter(
  (t) => !PROVISIONED_LATER.includes(t),
);

/**
 * The data columns per synced table (every original column except the `id`
 * primary key). The `AFTER UPDATE OF <data-cols>` trigger fires only when one of
 * these changes — never when the engine writes `uuid`/`updated_at`/`sync_status`
 * — so marking a row synced after a push cannot re-arm the dirty flag.
 */
// The child tables (expenses/income/fund_transactions/project_transactions)
// deliberately omit `account_id` here: this migration runs before migration 019
// adds that column, so its trigger cannot reference it. Migration 021 recreates
// those triggers with `account_id` appended once the column exists.
export const DATA_COLUMNS: Record<SyncedTable, string[]> = {
  categories: ['name', 'parent_id', 'is_default', 'sort_order', 'is_hidden'],
  accounts: ['name', 'type', 'purpose', 'opening_balance', 'is_default', 'is_active', 'created_at'],
  transfers: ['from_account_id', 'to_account_id', 'amount', 'date', 'note', 'created_at'],
  funds: ['type', 'target_amount', 'current_amount', 'is_target_met', 'created_at'],
  projects: [
    'name',
    'target_amount',
    'funded_amount',
    'priority_rank',
    'deadline',
    'status',
    'created_at',
  ],
  expenses: [
    'amount',
    'category_id',
    'subcategory_id',
    'note',
    'date',
    'is_recurring',
    'created_at',
  ],
  income: ['amount', 'source', 'note', 'date', 'created_at'],
  // `total_budget` is deliberately absent: migration 027 adds the column, so
  // this migration's trigger cannot reference it. Migration 028 recreates the
  // trigger with it appended (the `account_id` precedent above).
  allocations: [
    'month',
    'emergency_fund_pct',
    'savings_pct',
    'projects_pct',
    'expenses_pct',
    'priority_order',
    'is_locked',
    'created_at',
  ],
  category_budgets: [
    'month',
    'category_id',
    'allocated_amount',
    'rollover_enabled',
    'created_at',
  ],
  planned_lists: ['name', 'created_at'],
  // `expense_id` is a data column on purpose: deleting the linked expense sets it
  // to NULL (an FK action, which fires this trigger), so the reopened item syncs.
  planned_items: [
    'list_id',
    'name',
    'estimated_amount',
    'category_id',
    'account_id',
    'planned_date',
    'expense_id',
    'created_at',
  ],
  fund_transactions: ['fund_id', 'amount', 'direction', 'reason', 'date', 'created_at'],
  project_transactions: ['project_id', 'amount', 'date', 'source', 'created_at'],
  quick_add_templates: [
    'label',
    'amount',
    'category_id',
    'subcategory_id',
    'sort_order',
    'created_at',
  ],
  recurring_expenses: [
    'label',
    'amount',
    'category_id',
    'subcategory_id',
    'frequency',
    'next_due_date',
    'is_active',
    'created_at',
  ],
  zero_days: ['date', 'confirmed_at'],
  debts: [
    'person_name',
    'amount',
    'direction',
    'date',
    'due_date',
    'status',
    'note',
    'settled_at',
    'created_at',
  ],
};

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;
const NEW_UUID = `lower(hex(randomblob(16)))`;

/**
 * Creates (replacing any existing) the dirty-marking `AFTER UPDATE OF` trigger
 * for a table over the given data columns. Exported so migration 021 can rebuild
 * the child-table triggers once `account_id` exists. Fires only when a data
 * column changes (not the sync columns), and only when the statement left
 * `updated_at` alone. App code never writes `updated_at`; the sync engine always
 * sets it to the cloud row's time, so a pull keeps that timestamp while an edit
 * the user saves mid-pull is still marked pending (see migration 035).
 */
export async function createUpdateTrigger(
  db: SqliteDriver,
  table: string,
  dataColumns: ReadonlyArray<string>,
): Promise<void> {
  await db.execute(`DROP TRIGGER IF EXISTS trg_${table}_upd`);
  await db.execute(
    `CREATE TRIGGER trg_${table}_upd
       AFTER UPDATE OF ${dataColumns.join(', ')} ON ${table}
       WHEN NEW.updated_at IS OLD.updated_at
     BEGIN
       UPDATE ${table}
         SET updated_at = ${NOW}, sync_status = 'pending'
         WHERE rowid = NEW.rowid;
     END`,
  );
}

export async function addSyncColumns(db: SqliteDriver, table: SyncedTable): Promise<void> {
  await db.execute(`ALTER TABLE ${table} ADD COLUMN uuid TEXT`);
  await db.execute(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT`);
  await db.execute(
    `ALTER TABLE ${table} ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'`,
  );

  // The default category tree is seeded identically (same insertion order, same
  // ids) on every fresh install, so give those rows a deterministic uuid. Without
  // this, each device would mint random uuids for "Food", "Transport", etc. and
  // they would all duplicate the first time two devices sync. Custom categories
  // (is_default = 0) and every other table keep random uuids.
  if (table === 'categories') {
    await db.execute(
      `UPDATE categories SET uuid = 'seed-category-' || id WHERE uuid IS NULL AND is_default = 1`,
    );
  }

  // Backfill remaining rows so they have a stable cloud key and push on first sync.
  await db.execute(`UPDATE ${table} SET uuid = ${NEW_UUID} WHERE uuid IS NULL`);
  await db.execute(`UPDATE ${table} SET updated_at = ${NOW} WHERE updated_at IS NULL`);

  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_uuid ON ${table}(uuid)`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${table}_sync_status ON ${table}(sync_status)`,
  );

  await createInsertTrigger(db, table);
  await createUpdateTrigger(db, table, DATA_COLUMNS[table]);
}

/**
 * Creates (replacing any existing) the `AFTER INSERT` trigger that stamps a
 * locally inserted row with a uuid and marks it pending. Sync inserts supply
 * their own uuid, so `NEW.uuid IS NULL` alone tells them apart. It deliberately
 * ignores `_sync_guard`: the guard is raised for a whole pull, and a row the
 * user saves meanwhile must still get its cloud key (see migration 034).
 */
export async function createInsertTrigger(db: SqliteDriver, table: string): Promise<void> {
  await db.execute(`DROP TRIGGER IF EXISTS trg_${table}_ins`);
  await db.execute(
    `CREATE TRIGGER trg_${table}_ins
       AFTER INSERT ON ${table}
       WHEN NEW.uuid IS NULL
     BEGIN
       UPDATE ${table}
         SET uuid = ${NEW_UUID}, updated_at = ${NOW}, sync_status = 'pending'
         WHERE rowid = NEW.rowid;
     END`,
  );
}

/**
 * Adds per-record sync metadata (`uuid`, `updated_at`, `sync_status`) plus
 * dirty-marking triggers to every synced table, the `_sync_guard` flag (no
 * longer read since migrations 034/035, kept so old databases match), and the
 * `sync_meta` key/value store that holds the `lastPulledAt` cursor.
 */
export const migration: Migration = {
  id: 17,
  name: '017_add_sync_metadata',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS _sync_guard (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        active INTEGER NOT NULL DEFAULT 0
      )`,
    );
    await db.execute('INSERT OR IGNORE INTO _sync_guard (id, active) VALUES (1, 0)');

    await db.execute(
      `CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT)`,
    );

    for (const table of TABLES_PROVISIONED_HERE) {
      await addSyncColumns(db, table);
    }
  },
};
