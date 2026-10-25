// Emerald — shared across light and dark themes so the accent green reads the
// same in both (the dark palette uses this exact value).
export const PRIMARY_GREEN = '#10b981';
/**
 * The accent green for *text and small glyphs* (links, ghost/secondary button
 * labels, selected rows). PRIMARY_GREEN is ~2.5:1 on white, too faint for
 * text; this deeper emerald is ~5.5:1 on SURFACE and ~4.9:1 on PRIMARY_LIGHT
 * (WCAG AA, UX-02). PRIMARY_GREEN stays for fills, bars and the active tab.
 */
export const PRIMARY_TEXT = '#047857';
/**
 * The solid green *behind white content* — primary buttons, the add FAB,
 * active segments, chips and pills, a ticked checkbox. White on PRIMARY_GREEN
 * is ~2.5:1; on this ~5.5:1 (WCAG AA, UX-02b). Fills with nothing on them
 * (bars, dots, the toggle track) keep PRIMARY_GREEN.
 */
export const PRIMARY_FILL = '#047857';
export const PRIMARY_LIGHT = '#E8F5E9';
export const BACKGROUND = '#F5F7FA';
export const SURFACE = '#FFFFFF';
/** Subtle grey fill for neutral chips/tiles sitting on a white surface. */
export const SURFACE_MUTED = '#F3F4F6';
export const BORDER = '#E5E7EB';
/** Heavier divider/handle grey for elements that must read on white. */
export const BORDER_STRONG = '#D1D5DB';
export const TEXT_PRIMARY = '#1A1A1A';
export const TEXT_SECONDARY = '#374151';
export const TEXT_MUTED = '#6B7280';
/** Disabled icon/label tint — lighter than muted, still visible. */
export const TEXT_DISABLED = '#9CA3AF';
/** Text/icons sitting on a saturated fill (primary buttons, toasts, chips). */
export const TEXT_INVERSE = '#FFFFFF';
export const DANGER = '#D32F2F';
export const DANGER_LIGHT = '#FFEBEE';
export const WARNING = '#F9A825';
export const WARNING_LIGHT = '#FFFDE7';
export const SUCCESS = '#388E3C';
export const SUCCESS_LIGHT = '#E8F5E9';

// Darker companions for *text* on the matching *_LIGHT fills (or white). The
// base semantic colors stay for bar fills and accents, but don't reach the
// 4.5:1 WCAG contrast small text needs — WARNING on WARNING_LIGHT is ~1.9:1.
export const DANGER_TEXT = '#C62828';
export const WARNING_TEXT = '#B45309';
export const SUCCESS_TEXT = '#2E7D32';

// Kinds of spending (UX-15): why money went — routine bills, events, imprévus,
// everyday habits — and the fixed/variable split behind them. Never a status
// colour, so "everyday" (the habits you can change) cannot read as "good" and
// an imprévu cannot read as a warning. Fills reach 3:1 on SURFACE; the
// unexpected text companion reaches 4.5:1 on its tint and on SURFACE.
export const KIND_ROUTINE = '#64748B';
export const KIND_EVENT = '#7C3AED';
export const KIND_UNEXPECTED = '#A0522D';
export const KIND_UNEXPECTED_LIGHT = '#F6EBE1';
export const KIND_UNEXPECTED_TEXT = '#8B4513';
export const KIND_EVERYDAY = '#2563EB';
