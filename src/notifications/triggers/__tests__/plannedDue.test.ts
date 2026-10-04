import { act } from '@testing-library/react-native';

import i18n from '@/i18n';
import { buildPlannedDueAlert } from '@/notifications/triggers/plannedDue';

const AT = new Date(2026, 9, 7, 9, 0);

describe('buildPlannedDueAlert', () => {
  it('names the list, the count and the total, and is scheduled for the given moment', () => {
    const payload = buildPlannedDueAlert({
      listName: 'Market',
      count: 3,
      total: 12500,
      dueDate: '2026-10-10',
      kind: 'soon',
      scheduledAt: AT,
    });

    expect(payload.type).toBe('plannedDue');
    expect(payload.scheduledAt).toBe(AT);
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.body).toBe('Market: 3 items to buy by 10 October 2026 (12 500 FCFA).');
  });

  it('words the day itself and an overdue list differently', () => {
    const base = { listName: 'Market', count: 1, total: 2000, dueDate: '2026-10-10', scheduledAt: AT };

    expect(buildPlannedDueAlert({ ...base, kind: 'today' }).body).toBe(
      'Market: 1 item to buy today (2 000 FCFA).',
    );
    expect(buildPlannedDueAlert({ ...base, kind: 'overdue' }).body).toBe(
      'Market: 1 item still to buy — it was due 10 October 2026.',
    );
  });

  it('is written in French when the app is', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    const payload = buildPlannedDueAlert({
      listName: 'Marché',
      count: 2,
      total: 4000,
      dueDate: '2026-10-10',
      kind: 'today',
      scheduledAt: AT,
    });
    expect(payload.body).toBe("Marché : 2 articles à acheter aujourd'hui (4 000 FCFA).");
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
