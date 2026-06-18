// Emerald — shared across light and dark themes so the accent green reads the
// same in both (the dark palette uses this exact value).
export const PRIMARY_GREEN = '#10b981';
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
