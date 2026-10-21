const mockSchedule = jest.fn().mockResolvedValue('id');
const mockCancel = jest.fn().mockResolvedValue(undefined);
const mockScheduled = jest.fn();
jest.mock('@/notifications/notifications.service', () => ({
  scheduleNotification: (...args: unknown[]) => mockSchedule(...args),
  cancelNotification: (...args: unknown[]) => mockCancel(...args),
  getScheduledNotifications: () => mockScheduled(),
}));

const mockGetDue = jest.fn();
jest.mock('@/features/finance/tontines/tontines.due', () => ({
  getDueContributions: (...args: unknown[]) => mockGetDue(...args),
}));

import {
  countTontineAttention,
  planTontineReminders,
  reconcileTontineReminders,
} from '@/features/finance/tontines/tontines.reminders';
import type { DueContribution } from '@/features/finance/tontines/tontines.types';

/** Noon on 18 October 2026, local time. */
const NOW = new Date(2026, 9, 18, 12, 0);
const at9 = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 0);

function due(cycle: number, dueDate: string, extra: Partial<DueContribution> = {}): DueContribution {
  return { tontineId: 1, tontineName: 'Njangi', cycle, dueDate, amount: 10_000, ...extra };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockScheduled.mockResolvedValue([]);
});

describe('planTontineReminders', () => {
  it('warns three days before the next contribution and again on the day, at 09:00', () => {
    const plans = planTontineReminders([due(3, '2026-10-26')], NOW);

    expect(plans).toEqual([
      expect.objectContaining({ kind: 'soon', scheduledAt: at9(2026, 10, 23), dueDate: '2026-10-26', count: 1 }),
      expect.objectContaining({ kind: 'today', scheduledAt: at9(2026, 10, 26) }),
    ]);
  });

  it('only reminds about the next contribution of each tontine, not every later cycle', () => {
    const plans = planTontineReminders([due(3, '2026-10-26'), due(4, '2026-11-02')], NOW);

    expect(plans.every((p) => p.dueDate === '2026-10-26')).toBe(true);
  });

  it('groups a tontine’s overdue contributions into one nudge the next morning', () => {
    const plans = planTontineReminders([due(1, '2026-10-05'), due(2, '2026-10-12')], NOW);

    expect(plans).toEqual([
      expect.objectContaining({ kind: 'overdue', count: 2, amount: 20_000, scheduledAt: at9(2026, 10, 19) }),
    ]);
  });

  it('keeps tontines apart', () => {
    const plans = planTontineReminders(
      [due(2, '2026-10-12'), due(1, '2026-10-12', { tontineId: 2, tontineName: 'Office' })],
      NOW,
    );

    expect(plans.map((p) => p.tontineName).sort()).toEqual(['Njangi', 'Office']);
  });
});

describe('countTontineAttention', () => {
  it('counts overdue contributions and those due within three days', () => {
    expect(countTontineAttention([due(1, '2026-10-12'), due(2, '2026-10-19'), due(3, '2026-10-26')], '2026-10-18')).toEqual({
      soon: 1,
      overdue: 1,
    });
  });
});

describe('reconcileTontineReminders', () => {
  it('replaces earlier tontine reminders and leaves the others alone', async () => {
    mockScheduled.mockResolvedValue([
      { identifier: 'old', content: { data: { type: 'tontineDue' } } },
      { identifier: 'keep', content: { data: { type: 'plannedDue' } } },
    ]);
    mockGetDue.mockResolvedValue([due(2, '2026-10-12')]);

    const counts = await reconcileTontineReminders(NOW);

    expect(mockCancel).toHaveBeenCalledWith('old');
    expect(mockCancel).not.toHaveBeenCalledWith('keep');
    expect(mockSchedule).toHaveBeenCalledWith(expect.objectContaining({ type: 'tontineDue' }));
    expect(counts).toEqual({ soon: 0, overdue: 1 });
  });
});
