import { MESSAGES } from '@/notifications/notifications.config';

describe('notification copy', () => {
  it('phrases the zero-day check in plain language, not "Zero Day" jargon', () => {
    const { title, body } = MESSAGES.zeroDayCheck;
    const combined = `${title} ${body}`;

    // The dashboard action and the reminder must speak the same plain
    // language (audit M7) — no undefined "Zero Day" term.
    expect(combined).not.toMatch(/zero[\s-]?day/i);
    expect(combined.toLowerCase()).toContain('spend nothing');
  });
});
