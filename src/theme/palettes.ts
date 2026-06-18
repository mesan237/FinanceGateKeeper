import * as colors from '@/constants/colors';

import type { ColorScheme, ThemeColors } from './theme.types';

/**
 * Light palette — the app's original look. Built directly from `@/constants/colors`
 * so it stays in lockstep with the legacy constants (and the tests that assert them).
 */
export const LIGHT_COLORS: ThemeColors = {
  PRIMARY_GREEN: colors.PRIMARY_GREEN,
  PRIMARY_LIGHT: colors.PRIMARY_LIGHT,
  BACKGROUND: colors.BACKGROUND,
  SURFACE: colors.SURFACE,
  SURFACE_MUTED: colors.SURFACE_MUTED,
  BORDER: colors.BORDER,
  BORDER_STRONG: colors.BORDER_STRONG,
  TEXT_PRIMARY: colors.TEXT_PRIMARY,
  TEXT_SECONDARY: colors.TEXT_SECONDARY,
  TEXT_MUTED: colors.TEXT_MUTED,
  TEXT_DISABLED: colors.TEXT_DISABLED,
  TEXT_INVERSE: colors.TEXT_INVERSE,
  DANGER: colors.DANGER,
  DANGER_LIGHT: colors.DANGER_LIGHT,
  DANGER_TEXT: colors.DANGER_TEXT,
  WARNING: colors.WARNING,
  WARNING_LIGHT: colors.WARNING_LIGHT,
  WARNING_TEXT: colors.WARNING_TEXT,
  SUCCESS: colors.SUCCESS,
  SUCCESS_LIGHT: colors.SUCCESS_LIGHT,
  SUCCESS_TEXT: colors.SUCCESS_TEXT,
};

/**
 * Dark palette — a slate/navy ground (`#0f172a`) with emerald accents, amber
 * warnings, and red negatives. `*_LIGHT` fills become translucent tints so they
 * read as soft washes over dark surfaces rather than opaque blocks.
 */
export const DARK_COLORS: ThemeColors = {
  PRIMARY_GREEN: '#10b981',
  PRIMARY_LIGHT: 'rgba(16,185,129,0.15)',
  BACKGROUND: '#0f172a',
  SURFACE: '#1e293b',
  SURFACE_MUTED: '#334155',
  BORDER: '#334155',
  BORDER_STRONG: '#475569',
  TEXT_PRIMARY: '#f1f5f9',
  TEXT_SECONDARY: '#cbd5e1',
  TEXT_MUTED: '#94a3b8',
  TEXT_DISABLED: '#64748b',
  TEXT_INVERSE: '#ffffff',
  DANGER: '#f87171',
  DANGER_LIGHT: 'rgba(248,113,113,0.15)',
  DANGER_TEXT: '#fca5a5',
  WARNING: '#f59e0b',
  WARNING_LIGHT: 'rgba(245,158,11,0.15)',
  WARNING_TEXT: '#fbbf24',
  SUCCESS: '#10b981',
  SUCCESS_LIGHT: 'rgba(16,185,129,0.15)',
  SUCCESS_TEXT: '#34d399',
};

/** Resolves a colour scheme to its palette. */
export function paletteFor(scheme: ColorScheme): ThemeColors {
  return scheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}
