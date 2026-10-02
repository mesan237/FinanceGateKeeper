import Database from 'better-sqlite3';
import { Directory, File, Paths } from 'expo-file-system';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';
import { SYNCED_TABLES } from '@/services/migrations/017_add_sync_metadata';

const mockState: { driver: SqliteDriver | null } = { driver: null };

jest.mock('@/services/database', () => {
  const actual = jest.requireActual('@/services/database');
  return {
    ...actual,
    execute: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.execute(sql, params as never),
    query: (sql: string, params?: ReadonlyArray<unknown>) =>
      mockState.driver!.query(sql, params as never),
  };
});

import {
  createSnapshot,
  deleteSnapshot,
  ensureDailySnapshot,
  listSnapshots,
  restoreSnapshot,
} from '@/services/snapshots.service';

let sqlite: Database.Database;

const backupsDir = () => new Directory(Paths.document, 'backups');

/** A UTC instant on the given day of October 2026, at the given hour. */
function at(day: number, hour = 9): Date {
  return new Date(Date.UTC(2026, 9, day, hour, 0, 0));
}

async function insertExpense(amount: number): Promise<void> {
  const [cat] = await mockState.driver!.query<{ id: number }>(
    `SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1`,
  );
  await mockState.driver!.execute(
    `INSERT INTO expenses (amount, category_id, date, created_at) VALUES (?, ?, '2026-10-01', '2026-10-01T00:00:00.000Z')`,
    [amount, cat.id],
  );
}

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
  if (backupsDir().exists) backupsDir().delete();
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

describe('createSnapshot / listSnapshots', () => {
  it('writes a snapshot that lists with its reason, time, row count and size', async () => {
    await insertExpense(1500);

    const created = await createSnapshot('manual', at(2));
    const list = await listSnapshots();

    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(created);
    expect(created.reason).toBe('manual');
    expect(created.createdAt).toBe('2026-10-02T09:00:00.000Z');
    expect(created.rowCount).toBeGreaterThan(1); // seeded categories + the expense
    expect(created.sizeBytes).toBeGreaterThan(0);
  });

  it('lists snapshots newest first', async () => {
    await createSnapshot('daily', at(1));
    await createSnapshot('manual', at(3));
    await createSnapshot('daily', at(2));

    const list = await listSnapshots();

    expect(list.map((s) => s.createdAt)).toEqual([
      '2026-10-03T09:00:00.000Z',
      '2026-10-02T09:00:00.000Z',
      '2026-10-01T09:00:00.000Z',
    ]);
  });

  it('ignores files in the folder that are not snapshots', async () => {
    await createSnapshot('daily', at(1));
    const foreign = new File(backupsDir(), 'notes.txt');
    foreign.create();
    foreign.write('hello');
    const lookalike = new File(backupsDir(), 'snapshot-garbage.json');
    lookalike.create();
    lookalike.write('{}');

    const list = await listSnapshots();

    expect(list).toHaveLength(1);
    expect(list[0].reason).toBe('daily');
  });

  it('returns an empty list before any snapshot exists', async () => {
    await expect(listSnapshots()).resolves.toEqual([]);
  });

  it('keeps only the 5 newest manual and before-restore snapshots', async () => {
    for (let day = 1; day <= 7; day += 1) {
      await createSnapshot(day % 2 === 0 ? 'manual' : 'before-restore', at(day));
    }

    const list = await listSnapshots();

    expect(list).toHaveLength(5);
    expect(list[list.length - 1].createdAt).toBe('2026-10-03T09:00:00.000Z');
  });
});

describe('ensureDailySnapshot', () => {
  it('creates one snapshot per day only', async () => {
    const first = await ensureDailySnapshot(at(5, 8));
    const second = await ensureDailySnapshot(at(5, 20));

    expect(first?.reason).toBe('daily');
    expect(second).toBeNull();
    expect(await listSnapshots()).toHaveLength(1);
  });

  it('takes a new snapshot on the next day', async () => {
    await ensureDailySnapshot(at(5));
    await ensureDailySnapshot(at(6));

    expect(await listSnapshots()).toHaveLength(2);
  });

  it('does not count a manual snapshot as the daily one', async () => {
    await createSnapshot('manual', at(5, 7));

    const daily = await ensureDailySnapshot(at(5, 8));

    expect(daily?.reason).toBe('daily');
  });

  it('prunes to the 7 newest daily snapshots while sparing safety copies', async () => {
    await createSnapshot('manual', at(1, 6));
    await createSnapshot('before-restore', at(1, 7));

    for (let day = 1; day <= 9; day += 1) {
      await ensureDailySnapshot(at(day));
    }

    const list = await listSnapshots();
    const dailies = list.filter((s) => s.reason === 'daily');
    expect(dailies).toHaveLength(7);
    expect(dailies[dailies.length - 1].createdAt).toBe('2026-10-03T09:00:00.000Z');
    expect(list.filter((s) => s.reason !== 'daily')).toHaveLength(2);
  });
});

describe('deleteSnapshot', () => {
  it('removes the snapshot from the list', async () => {
    const keep = await createSnapshot('manual', at(1));
    const drop = await createSnapshot('manual', at(2));

    await deleteSnapshot(drop.id);

    expect((await listSnapshots()).map((s) => s.id)).toEqual([keep.id]);
  });

  it('rejects an id that is not a snapshot file name', async () => {
    await expect(deleteSnapshot('../users.db')).rejects.toThrow();
  });
});

describe('restoreSnapshot', () => {
  async function expenseAmounts(): Promise<number[]> {
    const rows = await mockState.driver!.query<{ amount: number }>(
      `SELECT amount FROM expenses ORDER BY amount`,
    );
    return rows.map((r) => r.amount);
  }

  async function markEverythingSynced(): Promise<void> {
    for (const table of SYNCED_TABLES) {
      await mockState.driver!.execute(`UPDATE ${table} SET sync_status = 'synced'`);
    }
  }

  it('replaces the data and leaves every row pending with a fresh updated_at', async () => {
    await insertExpense(1500);
    const snapshot = await createSnapshot('manual', at(1));
    await insertExpense(2000);
    await markEverythingSynced();

    await restoreSnapshot(snapshot.id, at(2));

    expect(await expenseAmounts()).toEqual([1500]);
    for (const table of SYNCED_TABLES) {
      const rows = await mockState.driver!.query<{ sync_status: string; updated_at: string }>(
        `SELECT sync_status, updated_at FROM ${table}`,
      );
      for (const row of rows) {
        expect(row.sync_status).toBe('pending');
        expect(row.updated_at).toBe('2026-10-02T09:00:00.000Z');
      }
    }
  });

  it('takes a "before restore" snapshot first, which undoes the restore', async () => {
    await insertExpense(1500);
    const snapshot = await createSnapshot('manual', at(1));
    await insertExpense(2000);

    await restoreSnapshot(snapshot.id, at(2));

    const [newest] = await listSnapshots();
    expect(newest.reason).toBe('before-restore');
    expect(newest.createdAt).toBe('2026-10-02T09:00:00.000Z');

    await restoreSnapshot(newest.id, at(3));
    expect(await expenseAmounts()).toEqual([1500, 2000]);
  });

  it('keeps the restored snapshot even when it is the oldest safety copy', async () => {
    for (let day = 1; day <= 5; day += 1) await createSnapshot('manual', at(day));
    const [oldest] = (await listSnapshots()).slice(-1);

    await restoreSnapshot(oldest.id, at(6));

    expect((await listSnapshots()).map((s) => s.id)).toContain(oldest.id);
  });

  it('rejects an unreadable snapshot without touching data or taking a safety copy', async () => {
    await insertExpense(1500);
    const broken = new File(backupsDir(), 'snapshot-2026-10-01T09-00-00-000Z-manual.json');
    broken.create();
    broken.write('not json');

    await expect(restoreSnapshot(broken.name, at(2))).rejects.toThrow();

    expect(await expenseAmounts()).toEqual([1500]);
    expect(await listSnapshots()).toEqual([]);
  });
});
