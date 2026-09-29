import i18n from '@/i18n';
import { notificationCopy } from '@/notifications/notifications.config';
import { buildDailyReminder } from '@/notifications/triggers/dailyReminder';
import { buildDebtDueAlert } from '@/notifications/triggers/debtDueDate';
import { buildOverBudgetAlert } from '@/notifications/triggers/overBudget';

describe('notification copy', () => {
  it('phrases the zero-day check in plain language, not "Zero Day" jargon', () => {
    const { title, body } = notificationCopy('zeroDayCheck');
    const combined = `${title} ${body}`;

    // The dashboard action and the reminder must speak the same plain
    // language (audit M7) — no undefined "Zero Day" term.
    expect(combined).not.toMatch(/zero[\s-]?day/i);
    expect(combined.toLowerCase()).toContain('spend nothing');
  });

  it('writes the daily reminder in French when the app is in French', async () => {
    await i18n.changeLanguage('fr');
    expect(buildDailyReminder('21:00').title).toBe('Notez vos dépenses');
  });

  it('writes the over-budget alert in French, naming the envelope', async () => {
    await i18n.changeLanguage('fr');
    const { body } = buildOverBudgetAlert({ overage: 3000, categoryName: 'Alimentation' });
    expect(body).toBe('Cette dépense vous fait dépasser votre budget Alimentation de 3 000 FCFA.');
  });

  it('writes the debt due date as a French date', async () => {
    await i18n.changeLanguage('fr');
    const { body } = buildDebtDueAlert({
      personName: 'Jean',
      amount: 15000,
      dueDate: '2026-06-15',
      kind: 'dueSoon',
    });
    expect(body).toBe('Jean — 15 000 FCFA à rembourser le 15 juin 2026.');
  });
});
