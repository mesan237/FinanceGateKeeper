import { contrastRatio } from '@/utils/contrastRatio';

describe('contrastRatio', () => {
  it('spans 1:1 for a colour on itself to 21:1 for black on white', () => {
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('gives the same ratio whichever colour is the text', () => {
    expect(contrastRatio('#10b981', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#10b981'), 10);
  });

  it('measures the old emerald as too faint for text on white (UX-02)', () => {
    expect(contrastRatio('#10b981', '#ffffff')).toBeCloseTo(2.54, 2);
  });

  it('reads three-digit hex the same as six-digit', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 5);
  });

  it('rejects colours it cannot read rather than guessing', () => {
    expect(() => contrastRatio('rgba(0,0,0,0.5)', '#ffffff')).toThrow();
  });
});
