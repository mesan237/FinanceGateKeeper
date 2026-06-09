import React from 'react';
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { PRIMARY_GREEN } from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Tighter padding and smaller text — for dense rows of secondary actions. */
  compact?: boolean;
}

export function Button({ label, onPress, disabled = false, compact = false, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        compact && styles.baseCompact,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
      {...rest}
    >
      <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseCompact: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONT_FAMILY.POPPINS_SEMIBOLD,
  },
  labelCompact: {
    fontSize: 13,
  },
});
