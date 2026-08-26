import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ICON_SIZE } from '@/constants/icons';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { hapticTap } from '@/utils/haptics';

export interface MonthStepperProps {
  /** Centred label between the arrows (e.g. "August 2026"). */
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** Disables the forward arrow — typically when already on the live period. */
  nextDisabled?: boolean;
  /** Disables the back arrow — e.g. at the start of recorded history. */
  prevDisabled?: boolean;
  /** testID stem; renders `${prefix}-prev` and `${prefix}-next`. */
  testIDPrefix: string;
}

/**
 * The shared previous / label / next period selector.
 *
 * One control for every month-scoped screen (budget, reports, the transaction
 * feed) so stepping through months feels identical wherever it happens — the
 * consolidation called for by UX audit L2.
 */
export function MonthStepper({
  label,
  onPrev,
  onNext,
  nextDisabled = false,
  prevDisabled = false,
  testIDPrefix,
}: MonthStepperProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.nav}>
      <StepArrow
        direction="back"
        label="Previous month"
        disabled={prevDisabled}
        onPress={onPrev}
        testID={`${testIDPrefix}-prev`}
      />
      <Typography variant="subheading">{label}</Typography>
      <StepArrow
        direction="forward"
        label="Next month"
        disabled={nextDisabled}
        onPress={onNext}
        testID={`${testIDPrefix}-next`}
      />
    </View>
  );
}

interface StepArrowProps {
  direction: 'back' | 'forward';
  label: string;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}

function StepArrow({ direction, label, disabled, onPress, testID }: StepArrowProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        hapticTap();
        onPress();
      }}
      hitSlop={12}
      style={[styles.arrow, disabled && styles.disabled]}
    >
      <Icon
        name={direction}
        size={ICON_SIZE.md}
        color={disabled ? c.TEXT_DISABLED : c.TEXT_SECONDARY}
      />
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SPACING.lg,
    backgroundColor: c.SURFACE_MUTED,
  },
  disabled: {
    opacity: 0.4,
  },
});
