import Database from 'better-sqlite3';

import { createBetterSqliteDriver, runMigrations, type SqliteDriver } from '@/services/database';
import { migrations } from '@/services/migrations';

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

import { getPreference } from '@/services/uiPreferences';

import {
  getAnalyticsConsent,
  initAnalytics,
  resetAnalyticsForTests,
  setAnalyticsConsent,
  setAnalyticsProviderFactoryForTests,
  track,
  trackScreen,
} from '../analytics.service';
import { createFakeAnalyticsProvider, type FakeAnalyticsProvider } from '../__fixtures__/fakeAnalyticsProvider';

let fake: FakeAnalyticsProvider;
let sqlite: Database.Database;

beforeEach(async () => {
  sqlite = new Database(':memory:');
  mockState.driver = createBetterSqliteDriver(
    sqlite as unknown as Parameters<typeof createBetterSqliteDriver>[0],
  );
  await runMigrations(mockState.driver, migrations);
  fake = createFakeAnalyticsProvider();
  resetAnalyticsForTests();
  setAnalyticsProviderFactoryForTests(() => fake);
});

afterEach(() => {
  resetAnalyticsForTests();
  sqlite.close();
});

describe('consent', () => {
  it('sends nothing and creates no provider before the user opts in', async () => {
    const factory = jest.fn(() => fake);
    setAnalyticsProviderFactoryForTests(factory);
    await initAnalytics();

    track('app_opened', { trigger: 'launch' });
    trackScreen('/budget');

    expect(getAnalyticsConsent()).toBe('unset');
    expect(factory).not.toHaveBeenCalled();
    expect(fake.captured).toEqual([]);
  });

  it('sends events once the user opts in, and remembers the choice on this phone', async () => {
    await initAnalytics();
    await setAnalyticsConsent(true, 'settings');
    track('expense_created', { entry_point: 'log_screen' });

    expect(await getPreference('analytics_consent')).toBe('granted');
    expect(fake.enabled).toBe(true);
    expect(fake.captured.map((e) => e.event)).toEqual(['analytics_enabled', 'expense_created']);
  });

  it('restores a saved opt-in on the next launch', async () => {
    await setAnalyticsConsent(true, 'settings');
    resetAnalyticsForTests();
    const next = createFakeAnalyticsProvider();
    setAnalyticsProviderFactoryForTests(() => next);

    await initAnalytics();
    track('app_opened', { trigger: 'launch' });

    expect(getAnalyticsConsent()).toBe('granted');
    expect(next.captured.map((e) => e.event)).toEqual(['app_opened']);
  });

  it('stops sending and discards the queue when the user withdraws consent', async () => {
    await setAnalyticsConsent(true, 'settings');
    await setAnalyticsConsent(false, 'settings');
    track('expense_created', { entry_point: 'log_screen' });

    expect(await getPreference('analytics_consent')).toBe('denied');
    expect(fake.enabled).toBe(false);
    expect(fake.disableCalls).toBe(1);
    expect(fake.captured.map((e) => e.event)).toEqual(['analytics_enabled']);
  });
});

describe('track', () => {
  beforeEach(async () => {
    await setAnalyticsConsent(true, 'settings');
    fake.captured.length = 0;
  });

  it('strips properties outside the allowlist before they reach the provider', () => {
    track('expense_created', {
      entry_point: 'add_sheet',
      amount: 25000,
      note: 'loyer',
    } as Parameters<typeof track>[1]);

    expect(fake.captured[0].properties).toEqual(
      expect.objectContaining({ entry_point: 'add_sheet' }),
    );
    expect(fake.captured[0].properties).not.toHaveProperty('amount');
    expect(fake.captured[0].properties).not.toHaveProperty('note');
  });

  it('adds the app language to every event', () => {
    track('app_opened', { trigger: 'foreground' });
    expect(fake.captured[0].properties).toEqual({ trigger: 'foreground', app_language: 'en' });
  });

  it('never throws when the provider fails', () => {
    fake.failNext = true;
    expect(() => track('expense_created', { entry_point: 'log_screen' })).not.toThrow();
    fake.failNext = true;
    expect(() => trackScreen('/budget')).not.toThrow();
  });

  it('sends a screen only when the route changes, not on every call for the same route', () => {
    trackScreen('/budget');
    trackScreen('/budget');
    trackScreen('/reports');
    trackScreen('/budget');

    expect(fake.screens).toEqual(['/budget', '/reports', '/budget']);
  });
});
