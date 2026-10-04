const mockSchedule = jest.fn().mockResolvedValue('id');
const mockCancel = jest.fn().mockResolvedValue(undefined);
const mockScheduled = jest.fn();
jest.mock('@/notifications/notifications.service', () => ({
  scheduleNotification: (...args: unknown[]) => mockSchedule(...args),
  cancelNotification: (...args: unknown[]) => mockCancel(...args),
  getScheduledNotifications: () => mockScheduled(),
}));

const mockGetDueItems = jest.fn();
jest.mock('@/features/finance/planned/planned.dueItems', () => ({
  ...jest.requireActual('@/features/finance/planned/planned.dueItems'),
  getDueItems: () => mockGetDueItems(),
}));

import { planReminders, reconcilePlannedReminders } from '@/features/finance/planned/planned.reminders';
import type { DueItem } from '@/features/finance/planned/planned.types';

/** Noon on 4 October 2026, local time. */
const NOW = new Date(2026, 9, 4, 12, 0);

function due(dueDate: string, extra: Partial<DueItem> = {}): DueItem {
  return {
    id: 1,
    listId: 1,
    listName: 'Market',
    name: 'Rice',
    estimatedAmount: 2000,
    dueDate,
    ...extra,
  };
}

const at9 = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 0);

describe('planReminders', () => {
  it('warns three days ahead and again on the day, at 09:00', () => {
    const plans = planReminders([due('2026-10-10')], NOW);
    expect(plans).toEqual([
      expect.objectContaining({ kind: 'soon', scheduledAt: at9(2026, 10, 7), dueDate: '2026-10-10' }),
      expect.objectContaining({ kind: 'today', scheduledAt: at9(2026, 10, 10) }),
    ]);
  });

  it('skips the heads-up once the warning window has already started', () => {
    const plans = planReminders([due('2026-10-06')], NOW);
    expect(plans.map((p) => p.kind)).toEqual(['today']);
  });

  it('nudges about an overdue list the next morning', () => {
    const plans = planReminders([due('2026-10-01')], NOW);
    expect(plans).toEqual([
      expect.objectContaining({ kind: 'overdue', scheduledAt: at9(2026, 10, 5) }),
    ]);
  });

  it('still reminds this morning when the app is opened before 09:00', () => {
    const early = new Date(2026, 9, 4, 7, 30);
    expect(planReminders([due('2026-10-04')], early)).toEqual([
      expect.objectContaining({ kind: 'today', scheduledAt: at9(2026, 10, 4) }),
    ]);
    expect(planReminders([due('2026-10-04')], NOW)).toEqual([]);
  });

  it('groups the items a list has due on the same day into one reminder', () => {
    const plans = planReminders(
      [
        due('2026-10-10', { id: 1, estimatedAmount: 2000 }),
        due('2026-10-10', { id: 2, estimatedAmount: 3000 }),
        due('2026-10-10', { id: 3, listId: 2, listName: 'School', estimatedAmount: 9000 }),
      ],
      NOW,
    );
    const marketToday = plans.find((p) => p.listName === 'Market' && p.kind === 'today');
    expect(marketToday).toMatchObject({ count: 2, total: 5000 });
    expect(plans.filter((p) => p.kind === 'today')).toHaveLength(2);
  });
});

describe('reconcilePlannedReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScheduled.mockResolvedValue([
      { identifier: 'old-planned', content: { data: { type: 'plannedDue' } } },
      { identifier: 'debt', content: { data: { type: 'debtDueDate' } } },
    ]);
  });

  it('replaces the previous planned reminders and leaves the others alone', async () => {
    mockGetDueItems.mockResolvedValue([due('2026-10-10')]);

    await reconcilePlannedReminders(NOW);

    expect(mockCancel).toHaveBeenCalledWith('old-planned');
    expect(mockCancel).not.toHaveBeenCalledWith('debt');
    expect(mockSchedule).toHaveBeenCalledTimes(2);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'plannedDue', scheduledAt: at9(2026, 10, 7) }),
    );
  });

  it('returns how many items need attention for the dot and the dashboard', async () => {
    mockGetDueItems.mockResolvedValue([due('2026-10-01'), due('2026-10-05'), due('2026-10-30')]);

    await expect(reconcilePlannedReminders(NOW)).resolves.toEqual({ dueSoon: 1, overdue: 1 });
  });
});
