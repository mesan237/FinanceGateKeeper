import { useMemo } from 'react';

import { useTheme } from './ThemeProvider';
import type { ThemeColors } from './theme.types';

/**
 * Builds a `StyleSheet` from the active palette, rebuilding only when the theme
 * changes. Lets components keep a `makeStyles(c)` factory at module scope while
 * still reacting to light/dark switches:
 *
 *   const styles = useThemedStyles(makeStyles);
 *   const makeStyles = (c: ThemeColors) => StyleSheet.create({ ... });
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
