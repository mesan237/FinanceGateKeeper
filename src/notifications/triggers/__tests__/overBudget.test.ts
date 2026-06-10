import { MESSAGES } from '@/notifications/notifications.config';
import { buildOverBudgetAlert } from '@/notifications/triggers/overBudget';

describe('buildOverBudgetAlert', () => {
  it('builds an over-budget payload carrying the formatted overage', () => {
    const payload = buildOverBudgetAlert({ overage: 3000 });

    expect(payload.type).toBe('overBudget');
    expect(payload.title).toBe(MESSAGES.overBudget.title);
    expect(payload.body).toContain('3 000 FCFA');
    expect(payload.body.length).toBeGreaterThan(0);
  });
});
