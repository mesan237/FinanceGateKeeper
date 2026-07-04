import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { useTheme } from '@/theme';
import type { DayActivityStatus } from '@/features/finance/expenses/expenses.types';

interface ActionButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  tint: string;
  iconColor: string;
  testID?: string;
}

function ActionButton({ icon, label, onPress, tint, iconColor, testID }: ActionButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: tint }, pressed && styles.pressed]}
    >
      <Icon name={icon} size={ICON_SIZE.md} color={iconColor} />
      <Typography style={[styles.buttonLabel, { color: iconColor }]}>{label}</Typography>
    </Pressable>
  );
}

interface QuickActionBarProps {
  zeroDay: DayActivityStatus;
  onConfirmZeroDay: () => void;
}

/**
 * Sticky action bar with shortcuts to the three most common actions.
 * The "No spending" action is hidden once the day has activity.
 */
export function QuickActionBar({ zeroDay, onConfirmZeroDay }: QuickActionBarProps) {
  const router = useRouter();
  const c = useTheme();
  const showZeroDay = !zeroDay.hasExpenses && !zeroDay.zeroDayConfirmed;

  return (
    <View style={styles.bar}>
      <ActionButton
        testID="quick-log-expense"
        icon="expense"
        label="Log Expense"
        onPress={() => router.push('/expenses/log')}
        tint={c.DANGER_LIGHT}
        iconColor={c.DANGER_TEXT}
      />
      <ActionButton
        testID="quick-log-income"
        icon="income"
        label="Log Income"
        onPress={() => router.push('/income/log')}
        tint={c.PRIMARY_LIGHT}
        iconColor={c.PRIMARY_GREEN}
      />
      {showZeroDay && (
        <ActionButton
          testID="quick-confirm-zero-day"
          icon="zeroDay"
          label="No spending"
          onPress={onConfirmZeroDay}
          tint={c.SURFACE_MUTED}
          iconColor={c.TEXT_MUTED}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: RADIUS.md,
  },
  pressed: {
    opacity: 0.75,
  },
  buttonLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
