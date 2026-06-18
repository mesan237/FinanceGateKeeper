import * as constants from '@/constants/colors';
import { DARK_COLORS, LIGHT_COLORS } from '@/theme/palettes';
import { COLOR_TOKENS } from '@/theme/theme.types';

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

  it('uses the requested dark ground and emerald accent', () => {
    expect(DARK_COLORS.BACKGROUND).toBe('#0f172a');
    expect(DARK_COLORS.PRIMARY_GREEN).toBe('#10b981');
  });
});
