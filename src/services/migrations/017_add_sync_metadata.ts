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
  'expenses',
  'income',
  'allocations',
  'fund_transactions',
  'project_transactions',
  'quick_add_templates',
  'recurring_expenses',
  'zero_days',
  'debts',
] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

/**
 * The data columns per synced table (every original column except the `id`
 * primary key). The `AFTER UPDATE OF <data-cols>` trigger fires only when one of
 * these changes — never when the engine writes `uuid`/`updated_at`/`sync_status`
 * — so marking a row synced after a push cannot re-arm the dirty flag.
 */
const DATA_COLUMNS: Record<SyncedTable, string[]> = {
  categories: ['name', 'parent_id', 'is_default', 'sort_order', 'is_hidden'],
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
const GUARD_OFF = `(SELECT active FROM _sync_guard WHERE id = 1) = 0`;

async function addSyncColumns(db: SqliteDriver, table: SyncedTable): Promise<void> {
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

  // Local inserts arrive with a NULL uuid → stamp + mark pending. Sync inserts
  // supply their own uuid, so the WHEN guard skips them. The _sync_guard flag is
  // a second belt-and-braces suppression the engine raises around its writes.
  await db.execute(
    `CREATE TRIGGER IF NOT EXISTS trg_${table}_ins
       AFTER INSERT ON ${table}
       WHEN NEW.uuid IS NULL AND ${GUARD_OFF}
     BEGIN
       UPDATE ${table}
         SET uuid = ${NEW_UUID}, updated_at = ${NOW}, sync_status = 'pending'
         WHERE rowid = NEW.rowid;
     END`,
  );

  // Fires only when a data column changes (not the sync columns), and only while
  // the engine is not mid-write — so a pull overwriting a row keeps its cloud
  // timestamp and synced status instead of bouncing back as pending.
  const dataCols = DATA_COLUMNS[table].join(', ');
  await db.execute(
    `CREATE TRIGGER IF NOT EXISTS trg_${table}_upd
       AFTER UPDATE OF ${dataCols} ON ${table}
       WHEN ${GUARD_OFF}
     BEGIN
       UPDATE ${table}
         SET updated_at = ${NOW}, sync_status = 'pending'
         WHERE rowid = NEW.rowid;
     END`,
  );
}

/**
 * Adds per-record sync metadata (`uuid`, `updated_at`, `sync_status`) plus
 * dirty-marking triggers to every synced table, the `_sync_guard` flag the sync
 * engine uses to suppress those triggers during its own writes, and the
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

    for (const table of SYNCED_TABLES) {
      await addSyncColumns(db, table);
    }
  },
};
