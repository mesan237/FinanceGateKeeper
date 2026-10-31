import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// A real in-memory database behind the service's helpers (no SQLite mocking).
const mockState: { driver: SqliteDriver | null } = { driver: null };

jest.mock('@/services/database', () => {
  const actual = jest.requireActual('@/services/database');
  return {
    ...actual,
    execute: (sql: string, params?: ReadonlyArray<unknown>) => mockState.driver!.execute(sql, params as never),
    query: (sql: string, params?: ReadonlyArray<unknown>) => mockState.driver!.query(sql, params as never),
  };
});

import {
  createIncomeSource,
  getIncomeSources,
  renameIncomeSource,
  setIncomeSourceHidden,
} from '@/features/finance/income/incomeSources.service';

let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0]);
  await runMigrations(mockState.driver, migrations);
});

afterEach(() => {
  sqlite.close();
  mockState.driver = null;
});

const BUSINESS = 3;

describe('getIncomeSources', () => {
  it('lists the built-in sources in order, e-commerce under business', async () => {
    const sources = await getIncomeSources();

    expect(sources.map((s) => [s.key, s.parentId])).toEqual([
      ['salary', null],
      ['freelance', null],
      ['business', null],
      ['gift', null],
      ['other', null],
      ['ecommerce', BUSINESS],
    ]);
    expect(sources.every((s) => !s.isHidden)).toBe(true);
  });
});

describe('createIncomeSource', () => {
  it('adds a source of the user’s own, after the built-ins', async () => {
    const id = await createIncomeSource('  Rent from the shop ', null);

    const sources = await getIncomeSources();
    const created = sources.find((s) => s.id === id);
    expect(created).toMatchObject({ key: null, name: 'Rent from the shop', parentId: null, isHidden: false });
    expect(sources.filter((s) => s.parentId === null).at(-1)?.id).toBe(id);
  });

  it('adds a subsource under a top-level source', async () => {
    const id = await createIncomeSource('Taxi business', BUSINESS);

    const sources = await getIncomeSources();
    expect(sources.filter((s) => s.parentId === BUSINESS).map((s) => s.id)).toEqual([6, id]);
  });

  it('rejects an empty name', async () => {
    await expect(createIncomeSource('   ', null)).rejects.toThrow('Give the source a name.');
  });

  it('rejects a name a sibling already has, built-in labels included, ignoring case', async () => {
    await createIncomeSource('Pension', null);

    await expect(createIncomeSource('pension', null)).rejects.toThrow('already exists');
    await expect(createIncomeSource('SALARY', null)).rejects.toThrow('already exists');
    await expect(createIncomeSource('e-commerce', BUSINESS)).rejects.toThrow('already exists');
  });

  it('allows the same name under different parents', async () => {
    await createIncomeSource('Rent', null);

    await expect(createIncomeSource('Rent', BUSINESS)).resolves.toEqual(expect.any(Number));
  });

  it('refuses a subsource of a subsource, or of a missing source', async () => {
    await expect(createIncomeSource('Shop A', 6)).rejects.toThrow('one level');
    await expect(createIncomeSource('Shop A', 99)).rejects.toThrow('Income source not found.');
  });
});

describe('renameIncomeSource', () => {
  it('renames a source the user made', async () => {
    const id = await createIncomeSource('Pension', null);

    await renameIncomeSource(id, 'Retirement pension');

    expect((await getIncomeSources()).find((s) => s.id === id)?.name).toBe('Retirement pension');
  });

  it('keeps built-in sources as they are (they follow the app language)', async () => {
    await expect(renameIncomeSource(1, 'My job')).rejects.toThrow('can only be hidden');
  });

  it('rejects a name its siblings already have', async () => {
    const id = await createIncomeSource('Pension', null);

    await expect(renameIncomeSource(id, 'Freelance')).rejects.toThrow('already exists');
  });

  it('accepts the source’s own name back unchanged', async () => {
    const id = await createIncomeSource('Pension', null);

    await expect(renameIncomeSource(id, 'pension')).resolves.toBeUndefined();
  });
});

describe('setIncomeSourceHidden', () => {
  it('hides a source and shows it again', async () => {
    await setIncomeSourceHidden(2, true);
    expect((await getIncomeSources()).find((s) => s.id === 2)?.isHidden).toBe(true);

    await setIncomeSourceHidden(2, false);
    expect((await getIncomeSources()).find((s) => s.id === 2)?.isHidden).toBe(false);
  });

  it('marks the hidden source for sync', async () => {
    await setIncomeSourceHidden(2, true);

    const row = sqlite.prepare('SELECT sync_status FROM income_sources WHERE id = 2').get() as { sync_status: string };
    expect(row.sync_status).toBe('pending');
  });
});
