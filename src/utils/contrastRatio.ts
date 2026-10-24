/** Parses `#rgb` or `#rrggbb` into 0–255 channels; throws on anything else. */
function parseHex(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`contrastRatio needs a #rgb or #rrggbb colour, got "${hex}"`);
  const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join('') : match[1];
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as [number, number, number];
}

/** WCAG relative luminance of an sRGB colour, 0 (black) to 1 (white). */
function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The WCAG 2 contrast ratio between two opaque hex colours, from 1 (none) to
 * 21 (black on white). Order does not matter. Text needs 4.5 (AA), large text
 * and UI parts 3. Translucent colours are rejected: their ratio depends on
 * what is behind them. Pure.
 */
export function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}
