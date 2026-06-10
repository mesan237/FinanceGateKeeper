import { buildDebtDueAlert } from '@/notifications/triggers/debtDueDate';

describe('buildDebtDueAlert', () => {
  it('builds a due-soon payload naming the person', () => {
    const payload = buildDebtDueAlert({
      personName: 'Jean',
      amount: 15000,
      dueDate: '2026-06-15',
      kind: 'dueSoon',
    });
    expect(payload.type).toBe('debtDueDate');
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.body).toContain('Jean');
  });

  it('uses different copy for an overdue debt', () => {
    const dueSoon = buildDebtDueAlert({
      personName: 'Paul',
      amount: 8000,
      dueDate: '2026-06-10',
      kind: 'dueSoon',
    });
    const overdue = buildDebtDueAlert({
      personName: 'Paul',
      amount: 8000,
      dueDate: '2026-06-10',
      kind: 'overdue',
    });
    expect(overdue.type).toBe('debtDueDate');
    expect(overdue.body).toContain('Paul');
    expect(overdue.body).not.toBe(dueSoon.body);
  });
});
