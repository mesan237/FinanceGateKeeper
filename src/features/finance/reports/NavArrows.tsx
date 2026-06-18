import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { TEXT_DISABLED, TEXT_MUTED } from '@/constants/colors';

export interface NavArrowsProps {
  /** Centered label between the arrows (e.g. "June 2026"). */
  label: string;
  onPrev: () => void;
  onNext: () => void;
  /** Disables the "next" arrow when on the live period. */
  nextDisabled: boolean;
  /** testID stem; renders `${prefix}-prev` and `${prefix}-next`. */
  testIDPrefix: string;
}

/**
 * The prev / label / next period selector shared by the weekly and monthly
 * reports. Mirrors the month navigator in TransactionList.
 */
export function NavArrows({ label, onPrev, onNext, nextDisabled, testIDPrefix }: NavArrowsProps) {
  return (
    <View style={styles.nav}>
      <Pressable
        testID={`${testIDPrefix}-prev`}
        accessibilityRole="button"
        accessibilityLabel="Previous period"
        onPress={onPrev}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={22} color={TEXT_MUTED} />
      </Pressable>
      <Typography variant="subheading">{label}</Typography>
      <Pressable
        testID={`${testIDPrefix}-next`}
        accessibilityRole="button"
        accessibilityLabel="Next period"
        accessibilityState={{ disabled: nextDisabled }}
        onPress={nextDisabled ? undefined : onNext}
        hitSlop={12}
        style={nextDisabled ? styles.disabled : undefined}
      >
        <Ionicons name="chevron-forward" size={22} color={nextDisabled ? TEXT_DISABLED : TEXT_MUTED} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabled: {
    opacity: 0.5,
  },
});
