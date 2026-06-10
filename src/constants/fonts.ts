/**
 * Font family names registered by the root layout's font loader.
 *
 * Custom fonts are selected by family name, not by `fontWeight` — with a custom
 * typeface `fontWeight` no longer maps to the right file, so each weight is its
 * own family. Headings and display text use Poppins (geometric, distinctive);
 * body copy and numbers use Work Sans (neutral, highly legible at small sizes).
 *
 * Every name here must be loaded in `app/_layout.tsx` via `useFonts`.
 */
export const FONT_FAMILY = {
  POPPINS_SEMIBOLD: 'Poppins_600SemiBold',
  POPPINS_BOLD: 'Poppins_700Bold',
  WORK_SANS_REGULAR: 'WorkSans_400Regular',
  WORK_SANS_MEDIUM: 'WorkSans_500Medium',
  WORK_SANS_SEMIBOLD: 'WorkSans_600SemiBold',
} as const;
