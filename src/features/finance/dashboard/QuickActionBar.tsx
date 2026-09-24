import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS, SPACING } from '@/constants/layout';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import type { DayActivityStatus } from '@/features/finance/expenses/expenses.types';

interface LogTileProps {
  icon: IconName;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  onPress: () => void;
  tint: string;
  accent: string;
  testID: string;
}

/**
 * One half of the quick-log pair: a tinted tile carrying the direction arrow,
 * what it records, and where the money goes. Sized for a thumb rather than the
 * toolbar pill it replaced.
 */
function LogTile({
  icon,
  title,
  subtitle,
  accessibilityLabel,
  onPress,
  tint,
  accent,
  testID,
}: LogTileProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: tint }, pressed && styles.pressed]}
    >
      <Icon name={icon} size={ICON_SIZE.lg} color={accent} />
      <Typography style={[styles.tileTitle, { color: accent }]}>{title}</Typography>
      <Typography style={[styles.tileSubtitle, { color: accent }]}>{subtitle}</Typography>
    </Pressable>
  );
}

interface QuickActionBarProps {
  zeroDay: DayActivityStatus;
  onConfirmZeroDay: () => void;
  /** Opens the shared AddTransactionSheet on the Expense segment (VS-26). */
  onLogExpense: () => void;
  /** Opens the shared AddTransactionSheet on the Income segment (VS-26). */
  onLogIncome: () => void;
}

/**
 * The dashboard's quick-log section: the two log tiles side by side with the
 * zero-day confirmation beneath them. Scrolls with the rest of the dashboard —
 * it is a section of the page, not a bar pinned above the tab strip, which left
 * the actions crowded against the system nav buttons.
 *
 * The tiles open the same AddTransactionSheet the Transactions FAB uses
 * (VS-26). The zero-day action is hidden once the day has activity.
 */
export function QuickActionBar({
  zeroDay,
  onConfirmZeroDay,
  onLogExpense,
  onLogIncome,
}: QuickActionBarProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const showZeroDay = !zeroDay.hasExpenses && !zeroDay.zeroDayConfirmed;

  return (
    <View style={styles.section}>
      <Typography variant="label">Quick log</Typography>

      <View style={styles.tiles}>
        <LogTile
          testID="quick-log-expense"
          icon="expense"
          title="Expense"
          subtitle="Money out"
          accessibilityLabel="Log an expense"
          onPress={onLogExpense}
          tint={c.DANGER_LIGHT}
          accent={c.DANGER_TEXT}
        />
        <LogTile
          testID="quick-log-income"
          icon="income"
          title="Income"
          subtitle="Money in"
          accessibilityLabel="Log income"
          onPress={onLogIncome}
          tint={c.PRIMARY_LIGHT}
          accent={c.PRIMARY_GREEN}
        />
      </View>

      {showZeroDay && (
        <Pressable
          testID="quick-confirm-zero-day"
          accessibilityRole="button"
          accessibilityLabel="Confirm I spent nothing today"
          onPress={onConfirmZeroDay}
          style={({ pressed }) => [styles.zeroDay, pressed && styles.pressed]}
        >
          <Icon name="zeroDay" size={ICON_SIZE.md} color={c.TEXT_MUTED} />
          <Typography style={styles.zeroDayLabel}>I spent nothing today</Typography>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  section: {
    gap: SPACING.sm,
  },
  tiles: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  tile: {
    flex: 1,
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  pressed: {
    opacity: 0.75,
  },
  tileTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
    marginTop: SPACING.xs,
  },
  tileSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.WORK_SANS_REGULAR,
    // The subtitle shares the tile's accent so the pair reads as one colour,
    // dimmed enough that the title still leads.
    opacity: 0.75,
  },
  zeroDay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.BORDER_STRONG,
  },
  zeroDayLabel: {
    color: c.TEXT_SECONDARY,
    fontSize: 14,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
