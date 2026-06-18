/**
 * Layout tokens — the only spacing, corner-radius, and elevation values UI
 * code should use. Keeping every surface on the same 4pt grid and radius
 * scale is what makes screens read as one product instead of near-misses.
 */

/** 4pt spacing scale for padding, margins, and gaps. */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Corner radii: `sm` for inputs/buttons/small tiles, `md` for cards and
 * controls, `lg` for sheets and oversized fields, `full` for pills, circles,
 * and FABs (clamps to half the element's size).
 */
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

/** Elevation presets — `card` for resting surfaces, `floating` for FABs. */
export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;
