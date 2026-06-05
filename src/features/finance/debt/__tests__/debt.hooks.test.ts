import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { Debt, DebtReminder } from '@/features/finance/debt/debt.types';

jest.mock('@/features/finance/debt/debt.service', () => ({
  getDebts: jest.fn(),
  getDebtById: jest.fn(),
  getOutstandingTotals: jest.fn(),
  getDueReminders: jest.fn(),
  settleDebt: jest.fn(),
  updateDebt: jest.fn(),
  deleteDebt: jest.fn(),
}));

jest.mock('@/notifications/notifications.service', () => ({
  scheduleNotification: jest.fn(),
  getScheduledNotifications: jest.fn(),
  cancelNotification: jest.fn(),
}));

import { useDebtDetail, useDebtReminders, useDebts } from '@/features/finance/debt/debt.hooks';
import * as debtService from '@/features/finance/debt/debt.service';
import * as notifications from '@/notifications/notifications.service';

const mockedGetDebts = debtService.getDebts as jest.MockedFunction<typeof debtService.getDebts>;
const mockedGetById = debtService.getDebtById as jest.MockedFunction<typeof debtService.getDebtById>;
const mockedTotals = debtService.getOutstandingTotals as jest.MockedFunction<
  typeof debtService.getOutstandingTotals
>;
const mockedReminders = debtService.getDueReminders as jest.MockedFunction<
  typeof debtService.getDueReminders
>;
const mockedSettle = debtService.settleDebt as jest.MockedFunction<typeof debtService.settleDebt>;
const mockedSchedule = notifications.scheduleNotification as jest.MockedFunction<
  typeof notifications.scheduleNotification
>;
const mockedGetScheduled = notifications.getScheduledNotifications as jest.MockedFunction<
  typeof notifications.getScheduledNotifications
>;
const mockedCancel = notifications.cancelNotification as jest.MockedFunction<
  typeof notifications.cancelNotification
>;

const JEAN: Debt = {
  id: 1,
  personName: 'Jean',
  amount: 15000,
  direction: 'lent',
  date: '2026-06-01',
  dueDate: '2026-06-15',
  status: 'pending',
  note: null,
  settledAt: null,
  createdAt: '2026-06-01T00:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetDebts.mockResolvedValue([JEAN]);
  mockedGetById.mockResolvedValue(JEAN);
  mockedTotals.mockResolvedValue({ lent: 15000, owed: 0 });
  mockedReminders.mockResolvedValue([]);
  mockedSettle.mockResolvedValue(undefined);
  mockedSchedule.mockResolvedValue('notif-id');
  mockedGetScheduled.mockResolvedValue([]);
  mockedCancel.mockResolvedValue(undefined);
});

describe('useDebts', () => {
  it('loads the directional list and outstanding totals', async () => {
    const { result } = renderHook(() => useDebts('lent'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedGetDebts).toHaveBeenCalledWith('lent');
    expect(result.current.debts).toEqual([JEAN]);
    expect(result.current.totals).toEqual({ lent: 15000, owed: 0 });
  });

  it('settle calls the service then re-fetches', async () => {
    const { result } = renderHook(() => useDebts('lent'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.settle(1);
    });
    expect(mockedSettle).toHaveBeenCalledWith(1);
    expect(mockedGetDebts).toHaveBeenCalledTimes(2);
  });
});

describe('useDebtDetail', () => {
  it('loads a single debt by id', async () => {
    const { result } = renderHook(() => useDebtDetail(1));
    await waitFor(() => expect(result.current.debt).not.toBeNull());
    expect(mockedGetById).toHaveBeenCalledWith(1);
  });
});

describe('useDebtReminders', () => {
  it('schedules one notification per due reminder', async () => {
    const reminders: DebtReminder[] = [
      { debtId: 1, personName: 'Jean', amount: 15000, dueDate: '2026-06-15', kind: 'dueSoon' },
      { debtId: 2, personName: 'Paul', amount: 8000, dueDate: '2026-06-10', kind: 'overdue' },
    ];
    mockedReminders.mockResolvedValue(reminders);

    renderHook(() => useDebtReminders());

    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(2));
    expect(mockedSchedule.mock.calls[0][0].type).toBe('debtDueDate');
  });

  it('schedules nothing when there are no reminders', async () => {
    renderHook(() => useDebtReminders());
    await waitFor(() => expect(mockedReminders).toHaveBeenCalled());
    expect(mockedSchedule).not.toHaveBeenCalled();
  });

  it('cancels previously scheduled debt reminders before rescheduling', async () => {
    mockedGetScheduled.mockResolvedValue([
      // @ts-expect-error — partial notification request; the hook only reads identifier + content.data.type.
      { identifier: 'old-1', content: { data: { type: 'debtDueDate' } } },
      // @ts-expect-error — a different type must be left untouched.
      { identifier: 'keep', content: { data: { type: 'dailyReminder' } } },
    ]);
    renderHook(() => useDebtReminders());
    await waitFor(() => expect(mockedCancel).toHaveBeenCalledWith('old-1'));
    expect(mockedCancel).not.toHaveBeenCalledWith('keep');
  });
});
