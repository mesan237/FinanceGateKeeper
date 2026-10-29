import { act, renderHook } from '@testing-library/react-native';

jest.mock('@/services/transactions', () => ({ getTransactionFeed: jest.fn().mockResolvedValue([]) }));

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  createExpense: jest.fn(),
  logFromQuickAddTemplate: jest.fn(),
  getQuickAddTemplates: jest.fn().mockResolvedValue([]),
}));

// The consent choice lives in `ui_preferences`; an in-memory map stands in.
jest.mock('@/services/uiPreferences', () => {
  const store = new Map<string, string>();
  return {
    getPreference: jest.fn(async (key: string) => store.get(key) ?? null),
    setPreference: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
});

import { useExpenseLog, useQuickAdd } from '@/features/finance/expenses/expenses.hooks';
import * as service from '@/features/finance/expenses/expenses.service';
import {
  resetAnalyticsForTests,
  setAnalyticsConsent,
  setAnalyticsProviderFactoryForTests,
} from '@/services/analytics/analytics.service';
import {
  createFakeAnalyticsProvider,
  type FakeAnalyticsProvider,
} from '@/services/analytics/__fixtures__/fakeAnalyticsProvider';

const mocked = service as jest.Mocked<typeof service>;
let fake: FakeAnalyticsProvider;

async function optIn(): Promise<void> {
  await setAnalyticsConsent(true, 'settings');
  fake.captured.length = 0;
}

function events(): string[] {
  return fake.captured.map((e) => e.event);
}

async function fillAndSubmit(result: { current: ReturnType<typeof useExpenseLog> }): Promise<number | null> {
  act(() => {
    result.current.setAmount('25000');
    result.current.setCategoryId(3);
    result.current.setNote('pharmacie du quartier');
  });
  let id: number | null = null;
  await act(async () => {
    id = await result.current.submit();
  });
  return id;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetAnalyticsForTests();
  fake = createFakeAnalyticsProvider();
  setAnalyticsProviderFactoryForTests(() => fake);
});

afterEach(() => resetAnalyticsForTests());

describe('expense analytics', () => {
  it('emits exactly one expense_created after a successful save, with no amount, note or category', async () => {
    await optIn();
    mocked.createExpense.mockResolvedValue(11);
    const { result } = renderHook(() => useExpenseLog({ entryPoint: 'add_sheet' }));

    await fillAndSubmit(result);

    expect(events()).toEqual(['expense_created']);
    const props = fake.captured[0].properties;
    expect(props).toEqual({
      entry_point: 'add_sheet',
      marked_unplanned: false,
      linked_event: false,
      has_subcategory: false,
      operation_duration_ms: expect.any(Number),
      app_language: 'en',
    });
    expect(JSON.stringify(props)).not.toMatch(/25000|pharmacie|"3"/);
  });

  it('emits expense_creation_failed and no success event when the save fails', async () => {
    await optIn();
    mocked.createExpense.mockRejectedValue(new Error('SQLITE_FULL: database or disk is full'));
    const { result } = renderHook(() => useExpenseLog());

    const id = await fillAndSubmit(result);

    expect(id).toBeNull();
    expect(events()).toEqual(['expense_creation_failed']);
    expect(fake.captured[0].properties).toEqual(
      expect.objectContaining({ entry_point: 'log_screen', failure_reason_code: 'save_error' }),
    );
    expect(JSON.stringify(fake.captured[0].properties)).not.toContain('SQLITE');
  });

  it('still saves the expense when the analytics provider throws', async () => {
    await optIn();
    fake.failNext = true;
    mocked.createExpense.mockResolvedValue(12);
    const { result } = renderHook(() => useExpenseLog());

    const id = await fillAndSubmit(result);

    expect(id).toBe(12);
    expect(mocked.createExpense).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('reports a failed attempt and then one success for a retry, never two successes', async () => {
    await optIn();
    mocked.createExpense.mockRejectedValueOnce(new Error('busy')).mockResolvedValueOnce(13);
    const { result } = renderHook(() => useExpenseLog());

    await fillAndSubmit(result);
    await act(async () => {
      await result.current.submit();
    });

    expect(events()).toEqual(['expense_creation_failed', 'expense_created']);
  });

  it('does not emit again when the form re-renders after a save', async () => {
    await optIn();
    mocked.createExpense.mockResolvedValue(14);
    const { result, rerender } = renderHook(() => useExpenseLog());

    await fillAndSubmit(result);
    rerender(undefined);
    act(() => result.current.setNote('autre'));
    rerender(undefined);

    expect(events()).toEqual(['expense_created']);
  });

  it('records which field blocked a save, not what was typed', async () => {
    await optIn();
    const { result } = renderHook(() => useExpenseLog());

    act(() => result.current.setAmount('5000'));
    act(() => {
      result.current.validate();
    });

    expect(events()).toEqual(['expense_validation_failed']);
    expect(fake.captured[0].properties).toEqual(
      expect.objectContaining({ entry_point: 'log_screen', invalid_field: 'category' }),
    );
  });

  it('sends nothing without an opt-in, and the expense is saved all the same', async () => {
    mocked.createExpense.mockResolvedValue(15);
    const { result } = renderHook(() => useExpenseLog());

    const id = await fillAndSubmit(result);

    expect(id).toBe(15);
    expect(fake.captured).toEqual([]);
  });

  it('stops sending once the user withdraws consent', async () => {
    await optIn();
    await setAnalyticsConsent(false, 'settings');
    mocked.createExpense.mockResolvedValue(16);
    const { result } = renderHook(() => useExpenseLog());

    await fillAndSubmit(result);

    expect(fake.captured).toEqual([]);
  });

  it('labels a quick-add save with its own entry point', async () => {
    await optIn();
    mocked.logFromQuickAddTemplate.mockResolvedValue(17);
    const { result } = renderHook(() => useQuickAdd());

    await act(async () => {
      await result.current.log(4);
    });

    expect(events()).toEqual(['expense_created']);
    expect(fake.captured[0].properties).toEqual(expect.objectContaining({ entry_point: 'quick_add' }));
  });
});
