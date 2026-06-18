import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { RADIUS } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...rest }: CardProps) {
  const styles = useThemedStyles(makeStyles);
  // Both themes use the same flat, hairline-bordered panel — the border (not a
  // shadow) gives cards their separation, so light and dark read identically.
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: c.SURFACE,
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: c.BORDER,
  },
});
