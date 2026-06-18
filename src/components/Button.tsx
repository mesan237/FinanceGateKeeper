import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { useTheme, type ThemeColors } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

function variantsFor(c: ThemeColors): Record<ButtonVariant, VariantStyle> {
  return {
    primary: { background: c.PRIMARY_GREEN, foreground: c.TEXT_INVERSE },
    secondary: { background: c.PRIMARY_LIGHT, foreground: c.PRIMARY_GREEN },
    ghost: { background: 'transparent', foreground: c.PRIMARY_GREEN },
    danger: { background: c.DANGER_LIGHT, foreground: c.DANGER_TEXT },
  };
}

export function Button({
  label,
  onPress,
  disabled = false,
  compact = false,
  variant = 'primary',
  loading = false,
  ...rest
}: ButtonProps) {
  const { background, foreground } = variantsFor(useTheme())[variant];
  const isDisabled = disabled || loading;

  // A shared value drives a subtle scale + dim while the finger is down, so the
  // press reads as a smooth physical depress rather than an instant style flip.
  const pressProgress = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressProgress.value * 0.04 }],
    opacity: 1 - pressProgress.value * 0.12,
  }));

  const handlePressIn = () => {
    pressProgress.value = withTiming(1, { duration: 90 });
  };
  const handlePressOut = () => {
    pressProgress.value = withSpring(0, { damping: 16, stiffness: 260, mass: 0.5 });
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.base,
        { backgroundColor: background },
        compact && styles.baseCompact,
        isDisabled && styles.disabled,
        animatedStyle,
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
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseCompact: {
    paddingVertical: 10,
    paddingHorizontal: 8,
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
