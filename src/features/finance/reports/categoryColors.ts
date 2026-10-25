/**
 * The category colour palette (UX-15). Picked by category id, so a category
 * keeps its colour every month whatever its rank, and free of status hues — no
 * green, amber or red — so a category never reads as good or bad. Mid-tones
 * that read as fills on both the light and the dark surface.
 */
export const CATEGORY_PALETTE = [
  '#60A5FA', // blue
  '#A78BFA', // violet
  '#F472B6', // pink
  '#22D3EE', // cyan
  '#818CF8', // indigo
  '#94A3B8', // slate
  '#E879F9', // fuchsia
  '#38BDF8', // sky
] as const;

/**
 * The palette colour for the category with `categoryId`: the same category
 * always gets the same colour, cycling through the palette by id. Pure.
 */
export function colorForCategory(categoryId: number): string {
  const len = CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[((categoryId % len) + len) % len];
}
