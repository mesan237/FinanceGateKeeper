/**
 * The semantic colour tokens the app renders with. Keys mirror the constant
 * names in `@/constants/colors` so migrating a file is a mechanical
 * `SURFACE` → `c.SURFACE` swap. Each theme (light, dark) supplies a value per token.
 */
export interface ThemeColors {
  PRIMARY_GREEN: string;
  PRIMARY_LIGHT: string;
  BACKGROUND: string;
  SURFACE: string;
  SURFACE_MUTED: string;
  BORDER: string;
  BORDER_STRONG: string;
  TEXT_PRIMARY: string;
  TEXT_SECONDARY: string;
  TEXT_MUTED: string;
  TEXT_DISABLED: string;
  TEXT_INVERSE: string;
  DANGER: string;
  DANGER_LIGHT: string;
  DANGER_TEXT: string;
  WARNING: string;
  WARNING_LIGHT: string;
  WARNING_TEXT: string;
  SUCCESS: string;
  SUCCESS_LIGHT: string;
  SUCCESS_TEXT: string;
}

/** Every token name — used to validate palettes cover the full set. */
export const COLOR_TOKENS: ReadonlyArray<keyof ThemeColors> = [
  'PRIMARY_GREEN',
  'PRIMARY_LIGHT',
  'BACKGROUND',
  'SURFACE',
  'SURFACE_MUTED',
  'BORDER',
  'BORDER_STRONG',
  'TEXT_PRIMARY',
  'TEXT_SECONDARY',
  'TEXT_MUTED',
  'TEXT_DISABLED',
  'TEXT_INVERSE',
  'DANGER',
  'DANGER_LIGHT',
  'DANGER_TEXT',
  'WARNING',
  'WARNING_LIGHT',
  'WARNING_TEXT',
  'SUCCESS',
  'SUCCESS_LIGHT',
  'SUCCESS_TEXT',
];

/** The user's appearance preference. `system` defers to the OS setting. */
export type ThemeMode = 'system' | 'light' | 'dark';

/** The resolved appearance actually rendered. */
export type ColorScheme = 'light' | 'dark';
