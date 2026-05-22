import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { TEXT_MUTED, TEXT_PRIMARY } from '@/constants/colors';

export type TypographyVariant = 'heading' | 'subheading' | 'body' | 'muted';

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
  heading: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '700',
  },
  subheading: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '400',
  },
  muted: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: '400',
  },
});
