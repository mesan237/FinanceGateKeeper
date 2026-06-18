import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { RADIUS } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export type IconButtonVariant = 'ghost' | 'filled';
export type IconButtonTone = 'default' | 'primary' | 'danger';

export interface IconButtonProps {
  /** Glyph from the chrome registry. */
  icon: IconName;
  /** Accessibility label — required since the button has no visible text. */
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
  /** `ghost` = transparent tappable square; `filled` = solid green action. */
  variant?: IconButtonVariant;
  /** Glyph colour for the ghost variant. Ignored when `filled`. */
  tone?: IconButtonTone;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A square, icon-only button. `ghost` is the low-emphasis control used for
 * inline row actions; `filled` is the high-emphasis green "+"/confirm action.
 * Shared so icon controls look identical across management screens.
 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  testID,
  variant = 'ghost',
  tone = 'default',
  disabled,
  style,
}: IconButtonProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();

  const filled = variant === 'filled';
  const glyphColor = filled
    ? c.TEXT_INVERSE
    : disabled
      ? c.TEXT_DISABLED
      : tone === 'danger'
        ? c.DANGER
        : tone === 'primary'
          ? c.PRIMARY_GREEN
          : c.TEXT_SECONDARY;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={filled ? 0 : 6}
      onPress={onPress}
      style={({ pressed }) => [
        filled ? styles.filled : styles.ghost,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Icon name={icon} size={ICON_SIZE.md} color={glyphColor} />
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  ghost: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: c.PRIMARY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
