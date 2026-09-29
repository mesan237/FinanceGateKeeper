import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput as RNTextInput, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { getTransactionIcon } from '@/constants/categoryIcons';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS, SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { displayCategoryName } from '@/i18n/categoryNames';
import { groupDigits } from '@/utils/groupDigits';

export interface PlannerCategoryRowProps {
  name: string;
  /** Digit-only draft amount; blank means nothing assigned yet. */
  value: string;
  /** Typical spend from recent months, shown as guidance. Omit when unknown. */
  suggestion?: number;
  rollover: boolean;
  /** Suppresses the top divider on the first row of a card. */
  first: boolean;
  onChange: (text: string) => void;
  onToggleRollover: () => void;
  /** Drops the plan's whole unassigned remainder into this envelope. */
  onTakeRemainder: () => void;
  testID: string;
}

/**
 * One category's line in the month planner: icon and name, what the user
 * typically spends, a compact amount field, and a rollover toggle.
 *
 * The "+ rest" control is what makes reaching zero unassigned a single tap
 * instead of mental arithmetic — the last few thousand FCFA are exactly where a
 * distribution task usually stalls.
 */
export function PlannerCategoryRow({
  name,
  value,
  suggestion,
  rollover,
  first,
  onChange,
  onToggleRollover,
  onTakeRemainder,
  testID,
}: PlannerCategoryRowProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation(['budget', 'common']);
  const shown = displayCategoryName(name);
  const icon = getTransactionIcon('expense', name);

  return (
    <View style={[styles.row, first && styles.rowFirst]} testID={testID}>
      <View style={styles.rowHeader}>
        <Typography style={styles.rowIcon}>{icon ?? '•'}</Typography>
        <View style={styles.rowLabel}>
          <Typography>{shown}</Typography>
          {suggestion ? (
            <Typography variant="muted">
              {t('planner.usuallySpend', { amount: formatCurrency(suggestion) })}
            </Typography>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('planner.takeRestA11y', { category: shown })}
          onPress={onTakeRemainder}
          hitSlop={8}
          testID={`${testID}-remainder`}
          style={styles.remainderButton}
        >
          <Typography style={styles.remainderText}>{t('planner.takeRest')}</Typography>
        </Pressable>
      </View>

      <View style={styles.rowControls}>
        <View style={styles.amountWrap}>
          <RNTextInput
            value={value ? groupDigits(value) : ''}
            onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
            placeholder="0"
            placeholderTextColor={c.TEXT_MUTED}
            keyboardType="numeric"
            accessibilityLabel={t('sheet.amountA11y', { category: shown })}
            testID={`${testID}-amount`}
            style={styles.amountInput}
          />
          <Typography style={styles.amountSuffix}>FCFA</Typography>
        </View>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: rollover }}
          accessibilityLabel={t('planner.rolloverA11y', { category: shown })}
          onPress={onToggleRollover}
          testID={`${testID}-rollover`}
          style={[styles.rolloverChip, rollover && styles.rolloverChipOn]}
        >
          <Typography style={[styles.rolloverText, rollover && { color: c.PRIMARY_GREEN }]}>
            {rollover ? t('planner.rollsOver') : t('planner.rollover')}
          </Typography>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    paddingTop: SPACING.lg,
    marginTop: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.BORDER,
    gap: SPACING.md,
  },
  rowFirst: {
    borderTopWidth: 0,
    marginTop: SPACING.sm,
    paddingTop: 0,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  rowIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  rowLabel: {
    flex: 1,
  },
  remainderButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  remainderText: {
    color: c.PRIMARY_GREEN,
    fontSize: 12,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  rowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  amountWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    backgroundColor: c.BACKGROUND,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: c.BORDER,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  amountInput: {
    flex: 1,
    minHeight: 28,
    textAlign: 'right',
    color: c.TEXT_PRIMARY,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
    fontSize: 17,
    padding: 0,
  },
  amountSuffix: {
    color: c.TEXT_MUTED,
    fontSize: 12,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  rolloverChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: c.BORDER,
  },
  rolloverChipOn: {
    backgroundColor: c.PRIMARY_LIGHT,
    borderColor: c.PRIMARY_GREEN,
  },
  rolloverText: {
    color: c.TEXT_MUTED,
    fontSize: 12,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
