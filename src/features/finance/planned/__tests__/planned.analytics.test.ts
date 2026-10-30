import { act, renderHook, waitFor } from '@testing-library/react-native';
import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

// Real SQL engine, in-memory connection — never mock SQLite, only swap the connection.
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

import { usePlannedItems, usePlannedLists } from '@/features/finance/planned/planned.hooks';
import {
  resetAnalyticsForTests,
  setAnalyticsConsent,
  setAnalyticsProviderFactoryForTests,
} from '@/services/analytics/analytics.service';
import {
  createFakeAnalyticsProvider,
  type FakeAnalyticsProvider,
} from '@/services/analytics/__fixtures__/fakeAnalyticsProvider';

let sqlite: Database.Database;
let fake: FakeAnalyticsProvider;

const FOOD = 1;
const CASH = 1;
const DUE = '2099-01-10';

function sent(): string[][] {
  return fake.captured.map((e) => [e.event, String(e.properties.feature_name), String(e.properties.action_type)]);
}

beforeEach(async () => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
  resetAnalyticsForTests();
  fake = createFakeAnalyticsProvider();
  setAnalyticsProviderFactoryForTests(() => fake);
  await setAnalyticsConsent(true, 'settings');
  fake.captured.length = 0;
});

afterEach(() => {
  resetAnalyticsForTests();
  sqlite.close();
  mockState.driver = null;
});

async function listWithRice() {
  const lists = renderHook(() => usePlannedLists());
  await waitFor(() => expect(lists.result.current.loading).toBe(false));
  await act(async () => {
    await lists.result.current.create('Market', DUE);
  });
  const items = renderHook(() => usePlannedItems(lists.result.current.lists[0].id));
  await waitFor(() => expect(items.result.current.loading).toBe(false));
  await act(async () => {
    await items.result.current.add({ name: 'Rice', estimatedAmount: 5000, categoryId: FOOD });
  });
  fake.captured.length = 0;
  return items.result;
}

describe('planned purchase analytics', () => {
  it('counts a ticked item as a planned purchase, not as a logged expense', async () => {
    const result = await listWithRice();

    await act(async () => {
      await result.current.buy(result.current.items[0].id, { amount: 4800, accountId: CASH, date: '2026-10-03' });
    });

    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM expenses').get()).toEqual({ n: 1 });
    expect(sent()).toEqual([['feature_action_completed', 'planned_item', 'buy']]);
    expect(JSON.stringify(fake.captured)).not.toMatch(/4800|Rice|Market/);
  });

  it('reports a failed purchase as a failure only', async () => {
    const result = await listWithRice();

    await act(async () => {
      await result.current.buy(result.current.items[0].id, { amount: 0, accountId: CASH, date: '2026-10-03' });
    });

    expect(sent()).toEqual([['operation_failed', 'planned_item', 'buy']]);
  });

  it('reports a rejected list without the name that was typed', async () => {
    const { result } = renderHook(() => usePlannedLists());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create('  ', DUE);
    });

    expect(result.current.error).toBe('Give it a name.');
    expect(sent()).toEqual([['operation_failed', 'planned_list', 'create']]);
  });
});
