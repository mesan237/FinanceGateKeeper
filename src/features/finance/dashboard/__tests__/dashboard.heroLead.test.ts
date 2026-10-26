import { heroLead } from '@/features/finance/dashboard/dashboard.heroLead';
import type { JourneyFigures } from '@/types/journey';

const FIGURES: JourneyFigures = {
  typicalMonth: 150_000,
  variableStart: 60_000,
  variableLatest: { month: '2026-09', amount: 52_000 },
  logging: { month: '2026-10', loggedDays: 18, daysSoFar: 23 },
};

describe('heroLead (UX-24)', () => {
  it('follows the plan alone while the step is unknown', () => {
    expect(heroLead(null, true, null)).toEqual({ spentView: false, note: null });
    expect(heroLead(null, false, null)).toEqual({ spentView: true, note: null });
  });

  it('leads with what was spent while observing, even with a plan', () => {
    expect(heroLead('observe', true, FIGURES)).toEqual({ spentView: true, note: null });
  });

  it('adds the typical month on the See step', () => {
    expect(heroLead('see', true, FIGURES)).toEqual({
      spentView: true,
      note: { kind: 'typical', amount: 150_000 },
    });
  });

  it('leaves the typical-month note out until there is one', () => {
    expect(heroLead('see', false, { ...FIGURES, typicalMonth: null }).note).toBeNull();
  });

  it('leads with the plan from the Plan step on', () => {
    expect(heroLead('plan', true, FIGURES)).toEqual({ spentView: false, note: null });
    expect(heroLead('grow', true, FIGURES)).toEqual({ spentView: false, note: null });
  });

  it('still shows what was spent from Plan on when the month has no plan', () => {
    expect(heroLead('plan', false, FIGURES).spentView).toBe(true);
  });

  it('sets variable spending against the start while optimizing', () => {
    expect(heroLead('optimize', true, FIGURES)).toEqual({
      spentView: false,
      note: { kind: 'variable', month: '2026-09', latest: 52_000, start: 60_000 },
    });
  });

  it('leaves the variable note out without a month to compare', () => {
    expect(heroLead('optimize', true, { ...FIGURES, variableLatest: null }).note).toBeNull();
  });
});
