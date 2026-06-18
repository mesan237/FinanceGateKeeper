import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { SURFACE } from '@/constants/colors';
import { RADIUS, SHADOW } from '@/constants/layout';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...rest }: CardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SURFACE,
    borderRadius: RADIUS.md,
    padding: 16,
    ...SHADOW.card,
  },
});
