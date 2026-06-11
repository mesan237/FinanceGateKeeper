import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';

import {
  DANGER,
  DANGER_LIGHT,
  PRIMARY_GREEN,
  PRIMARY_LIGHT,
} from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Tighter padding and smaller text — for dense rows of secondary actions. */
  compact?: boolean;
  /** Visual emphasis. `primary` (default) is the filled green CTA. */
  variant?: ButtonVariant;
  /** Shows a spinner and blocks presses while an action is in flight. */
  loading?: boolean;
}

interface VariantStyle {
  background: string;
  foreground: string;
}

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  primary: { background: PRIMARY_GREEN, foreground: '#FFFFFF' },
  secondary: { background: PRIMARY_LIGHT, foreground: PRIMARY_GREEN },
  ghost: { background: 'transparent', foreground: PRIMARY_GREEN },
  danger: { background: DANGER_LIGHT, foreground: DANGER },
};

export function Button({
  label,
  onPress,
  disabled = false,
  compact = false,
  variant = 'primary',
  loading = false,
  ...rest
}: ButtonProps) {
  const { background, foreground } = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background },
        compact && styles.baseCompact,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text
          style={[styles.label, { color: foreground }, compact && styles.labelCompact]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
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
    fontSize: 16,
    fontFamily: FONT_FAMILY.POPPINS_SEMIBOLD,
  },
  labelCompact: {
    fontSize: 13,
  },
});
