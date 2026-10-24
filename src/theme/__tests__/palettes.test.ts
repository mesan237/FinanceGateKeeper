import * as constants from '@/constants/colors';
import { DARK_COLORS, LIGHT_COLORS } from '@/theme/palettes';
import { COLOR_TOKENS } from '@/theme/theme.types';
import { contrastRatio } from '@/utils/contrastRatio';

describe('palettes', () => {
  it('LIGHT_COLORS matches the legacy colour constants for every token', () => {
    for (const token of COLOR_TOKENS) {
      expect(LIGHT_COLORS[token]).toBe((constants as Record<string, string>)[token]);
    }
  });

  it('DARK_COLORS defines a non-empty value for every token', () => {
    for (const token of COLOR_TOKENS) {
      expect(typeof DARK_COLORS[token]).toBe('string');
      expect(DARK_COLORS[token].length).toBeGreaterThan(0);
    }
  });

  it('keeps green text at WCAG AA (4.5:1) on every surface it sits on (UX-02)', () => {
    for (const ground of [LIGHT_COLORS.SURFACE, LIGHT_COLORS.BACKGROUND, LIGHT_COLORS.PRIMARY_LIGHT]) {
      expect(contrastRatio(LIGHT_COLORS.PRIMARY_TEXT, ground)).toBeGreaterThanOrEqual(4.5);
    }
    // The dark PRIMARY_LIGHT is a translucent wash over SURFACE, so SURFACE stands in for it.
    for (const ground of [DARK_COLORS.SURFACE, DARK_COLORS.BACKGROUND, DARK_COLORS.SURFACE_MUTED]) {
      expect(contrastRatio(DARK_COLORS.PRIMARY_TEXT, ground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps white labels on green fills at WCAG AA (4.5:1) in both themes (UX-02b)', () => {
    expect(contrastRatio(LIGHT_COLORS.TEXT_INVERSE, LIGHT_COLORS.PRIMARY_FILL)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(DARK_COLORS.TEXT_INVERSE, DARK_COLORS.PRIMARY_FILL)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses the requested dark ground and emerald accent', () => {
    expect(DARK_COLORS.BACKGROUND).toBe('#0f172a');
    expect(DARK_COLORS.PRIMARY_GREEN).toBe('#10b981');
  });
});
