import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { RADIUS, SHADOW } from '@/constants/layout';
import { useThemeMode, useThemedStyles, type ThemeColors } from '@/theme';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...rest }: CardProps) {
  const styles = useThemedStyles(makeStyles);
  // Shadows read as nothing on a dark ground, so a hairline border gives cards
  // their separation in dark mode. Light mode keeps its original shadow-only look.
  const { scheme } = useThemeMode();
  return (
    <View style={[styles.card, scheme === 'dark' && styles.cardDark, style]} {...rest}>
      {children}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.SURFACE,
    borderRadius: RADIUS.md,
    padding: 16,
    ...SHADOW.card,
  },
  cardDark: {
    borderWidth: 1,
    borderColor: c.BORDER,
  },
});
