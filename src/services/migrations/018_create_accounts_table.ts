import type { Migration } from '@/services/database';

/**
 * Creates the `accounts` table: the wallets / payment channels a user moves
 * money through (physical cash, mobile money, bank, card). `type` and `purpose`
 * are closed enums guarded by CHECK constraints. A balance is never stored — it
 * is computed on read from the transaction tables (see `accounts.service.ts`),
 * so this table holds only the immutable identity plus the `opening_balance`
 * starting figure. `is_default` marks the wallet that pre-fills every picker;
 * `is_active = 0` is the soft-delete (history is preserved). Seeds the three
 * channels every user in this market starts with: Cash, MTN MoMo, Orange Money.
 */
export const migration: Migration = {
  id: 18,
  name: '018_create_accounts_table',
  async up(db) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('cash','mobile_money','bank','card')),
        purpose TEXT NOT NULL CHECK(purpose IN ('spending','saving','emergency','general')),
        opening_balance INTEGER NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )`,
    );

    const now = new Date().toISOString();
    const seeds: ReadonlyArray<[string, string, string, number]> = [
      ['Cash', 'cash', 'spending', 1],
      ['MTN MoMo', 'mobile_money', 'general', 0],
      ['Orange Money', 'mobile_money', 'general', 0],
    ];
    for (const [name, type, purpose, isDefault] of seeds) {
      await db.execute(
        `INSERT INTO accounts (name, type, purpose, opening_balance, is_default, is_active, created_at)
         VALUES (?, ?, ?, 0, ?, 1, ?)`,
        [name, type, purpose, isDefault, now],
      );
    }
  },
};
