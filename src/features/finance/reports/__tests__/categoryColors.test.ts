import { CATEGORY_PALETTE, colorForCategory } from '@/features/finance/reports/categoryColors';

/** The hue of a #rrggbb colour, in degrees. */
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** Saturation, so a grey's hue is ignored. */
function saturation(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

describe('categoryColors (UX-15)', () => {
  it('exposes a non-empty palette', () => {
    expect(CATEGORY_PALETTE.length).toBeGreaterThan(0);
  });

  it('gives a category the same colour every month, whatever its rank', () => {
    // Transport (id 5) ranks first in one month and third in another: same colour.
    expect(colorForCategory(5)).toBe(colorForCategory(5));
    expect(colorForCategory(5)).toBe(CATEGORY_PALETTE[5 % CATEGORY_PALETTE.length]);
  });

  it('spreads neighbouring categories over different colours', () => {
    expect(colorForCategory(1)).not.toBe(colorForCategory(2));
  });

  it('stays in range for any id', () => {
    expect(CATEGORY_PALETTE).toContain(colorForCategory(0));
    expect(CATEGORY_PALETTE).toContain(colorForCategory(-3));
    expect(CATEGORY_PALETTE).toContain(colorForCategory(10_007));
  });

  it('uses no status hue (green, amber or red), so a category never reads as good or bad', () => {
    for (const colour of CATEGORY_PALETTE) {
      if (saturation(colour) < 0.2) continue;
      const h = hue(colour);
      const isRed = h < 15 || h >= 345;
      const isAmber = h >= 30 && h < 60;
      const isGreen = h >= 80 && h < 165;
      expect({ colour, isRed, isAmber, isGreen }).toEqual({ colour, isRed: false, isAmber: false, isGreen: false });
    }
  });
});
