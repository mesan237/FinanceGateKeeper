import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { TEXT_MUTED, TEXT_PRIMARY } from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';

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
  return (
    <Text style={[styles[variant], style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  display: {
    color: TEXT_PRIMARY,
    fontSize: 28,
    fontFamily: FONT_FAMILY.POPPINS_BOLD,
    letterSpacing: -0.5,
  },
  heading: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontFamily: FONT_FAMILY.POPPINS_BOLD,
  },
  subheading: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontFamily: FONT_FAMILY.POPPINS_SEMIBOLD,
  },
  body: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontFamily: FONT_FAMILY.WORK_SANS_REGULAR,
  },
  muted: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontFamily: FONT_FAMILY.WORK_SANS_REGULAR,
  },
  label: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
