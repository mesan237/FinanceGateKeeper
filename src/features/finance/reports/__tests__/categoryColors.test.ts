import { CATEGORY_PALETTE, colorForIndex } from '@/features/finance/reports/categoryColors';

describe('categoryColors', () => {
  it('exposes a non-empty palette', () => {
    expect(CATEGORY_PALETTE.length).toBeGreaterThan(0);
  });

  it('returns a stable color for a given index', () => {
    expect(colorForIndex(0)).toBe(colorForIndex(0));
    expect(colorForIndex(2)).toBe(CATEGORY_PALETTE[2]);
  });

  it('cycles once the index exceeds the palette length', () => {
    expect(colorForIndex(CATEGORY_PALETTE.length)).toBe(CATEGORY_PALETTE[0]);
    expect(colorForIndex(CATEGORY_PALETTE.length + 1)).toBe(CATEGORY_PALETTE[1]);
  });

  it('handles negative indexes by wrapping into range', () => {
    expect(colorForIndex(-1)).toBe(CATEGORY_PALETTE[CATEGORY_PALETTE.length - 1]);
  });
});
