import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { FONT_FAMILY } from '@/constants/fonts';
import { useThemedStyles, type ThemeColors } from '@/theme';

export type TypographyVariant = 'display' | 'heading' | 'subheading' | 'body' | 'muted' | 'label';

export interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  children: React.ReactNode;
}

export function Typography({
  variant = 'body',
  style,
  children,
  ...rest
}: TypographyProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Text style={[styles[variant], style]} {...rest}>
      {children}
    </Text>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  display: {
    color: c.TEXT_PRIMARY,
    fontSize: 28,
    fontFamily: FONT_FAMILY.POPPINS_BOLD,
    letterSpacing: -0.5,
  },
  heading: {
    color: c.TEXT_PRIMARY,
    fontSize: 22,
    fontFamily: FONT_FAMILY.POPPINS_BOLD,
  },
  subheading: {
    color: c.TEXT_PRIMARY,
    fontSize: 16,
    fontFamily: FONT_FAMILY.POPPINS_SEMIBOLD,
  },
  body: {
    color: c.TEXT_PRIMARY,
    fontSize: 15,
    fontFamily: FONT_FAMILY.WORK_SANS_REGULAR,
  },
  muted: {
    color: c.TEXT_MUTED,
    fontSize: 13,
    fontFamily: FONT_FAMILY.WORK_SANS_REGULAR,
  },
  label: {
    color: c.TEXT_MUTED,
    fontSize: 11,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
