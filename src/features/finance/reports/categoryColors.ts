/**
 * The single category color palette for the Reports tab. Both the spending
 * donut's arcs and the breakdown-row dots index into it by a category's
 * position in the (amount-desc) breakdown, so a category's slice and its dot
 * always read as the same color. Tuned to the calm finance look of the
 * redesign mockup — a mint green leads, with a navy and amber alongside.
 */
export const CATEGORY_PALETTE = [
  '#34D399', // mint green
  '#1E293B', // navy
  '#F59E0B', // amber
  '#60A5FA', // blue
  '#A78BFA', // violet
  '#F472B6', // pink
  '#22D3EE', // cyan
  '#FB7185', // rose
] as const;

/**
 * The palette color for a category at position `index`, cycling when the index
 * runs past the palette and wrapping negative indexes back into range. Pure.
 */
export function colorForIndex(index: number): string {
  const len = CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[((index % len) + len) % len];
}
