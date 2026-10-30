import { ANALYTICS_EVENTS, PROHIBITED_KEY_FRAGMENTS, PROHIBITED_PROPERTY_KEYS } from '../analytics.schema';
import { sanitizeEvent, screenNameFromSegments } from '../analytics.sanitize';

describe('sanitizeEvent', () => {
  it('keeps allowlisted properties with valid values', () => {
    expect(
      sanitizeEvent('expense_created', {
        entry_point: 'quick_add',
        marked_unplanned: true,
        operation_duration_ms: 42,
      }),
    ).toEqual({ entry_point: 'quick_add', marked_unplanned: true, operation_duration_ms: 42 });
  });

  it('removes properties that are not in the event allowlist', () => {
    const props = { entry_point: 'log_screen', amount: 5000, note: 'pharmacie' } as Record<string, unknown>;
    expect(sanitizeEvent('expense_created', props)).toEqual({ entry_point: 'log_screen' });
  });

  it('removes enum values outside the documented set', () => {
    const props = { entry_point: 'Courses du mois' } as Record<string, unknown>;
    expect(sanitizeEvent('expense_created', props)).toEqual({});
  });

  it('rejects non-boolean flags and non-integer or out-of-range durations', () => {
    const props = { marked_unplanned: 'yes', operation_duration_ms: -3 } as Record<string, unknown>;
    expect(sanitizeEvent('expense_created', props)).toEqual({});
    expect(sanitizeEvent('expense_created', { operation_duration_ms: 1e9 })).toEqual({});
    expect(sanitizeEvent('expense_created', { operation_duration_ms: 12.7 })).toEqual({
      operation_duration_ms: 13,
    });
  });

  it('returns null for an event that is not in the catalogue', () => {
    expect(sanitizeEvent('expense_amount_logged' as never, {})).toBeNull();
  });

  it('accepts only route templates as screen names, never concrete ids or query strings', () => {
    expect(sanitizeEvent('screen_viewed', { screen_name: '/expenses/[id]' })).toEqual({
      screen_name: '/expenses/[id]',
    });
    expect(sanitizeEvent('screen_viewed', { screen_name: '/expenses/42' })).toEqual({});
    expect(sanitizeEvent('screen_viewed', { screen_name: '/transfers/log?to=3' })).toEqual({});
    expect(sanitizeEvent('screen_viewed', { screen_name: '/goals/Mariage' })).toEqual({});
  });
});

describe('the event catalogue', () => {
  it('names every event and property in snake_case', () => {
    for (const [event, spec] of Object.entries(ANALYTICS_EVENTS)) {
      expect(event).toMatch(/^[a-z]+(_[a-z]+)*$/);
      for (const key of Object.keys(spec)) expect(key).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });

  it('allows no prohibited property on any event', () => {
    for (const spec of Object.values(ANALYTICS_EVENTS)) {
      for (const key of Object.keys(spec)) {
        expect(PROHIBITED_PROPERTY_KEYS).not.toContain(key);
        for (const fragment of PROHIBITED_KEY_FRAGMENTS) expect(key).not.toContain(fragment);
      }
    }
  });
});

describe('screenNameFromSegments', () => {
  it('drops route groups and index, keeping dynamic placeholders', () => {
    expect(screenNameFromSegments(['(drawer)', '(tabs)', 'budget'])).toBe('/budget');
    expect(screenNameFromSegments(['budget', 'category', '[id]'])).toBe('/budget/category/[id]');
    expect(screenNameFromSegments(['settings', 'index'])).toBe('/settings');
    expect(screenNameFromSegments([])).toBe('/');
  });
});
