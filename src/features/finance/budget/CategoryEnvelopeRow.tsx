import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { getTransactionIcon } from '@/constants/categoryIcons';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE } from '@/constants/icons';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { displayCategoryName } from '@/i18n/categoryNames';

import { healthDisplay } from './budgetHealthDisplay';
import type { CategoryBudgetProgress } from './budget.types';

export interface CategoryEnvelopeRowProps {
  envelope: CategoryBudgetProgress;
  /** Suppresses the top divider on the first row of a card. */
  first: boolean;
  onPress: () => void;
  /**
   * The full row, for the category detail: spent of available and the run-rate
   * line always. The Budget tab's list leaves it off (UX-13).
   */
  detailed?: boolean;
}

/**
 * One category envelope in the Budget tab's list.
 *
 * Two lines on the Budget tab (UX-13): name and what is left, then a paced
 * meter. The run-rate line (percentage used, daily average, projection) joins
 * only when the envelope is at risk or over, where it explains the status; the
 * category detail passes `detailed` and always shows it, with spent of
 * available. Rollover is a small icon with an accessible label.
 *
 * A category with no envelope but some spending renders as an "unbudgeted" row
 * rather than being hidden — silently omitting real spending would make the
 * list flatter and less honest than the month actually is.
 */
export function CategoryEnvelopeRow({ envelope, first, onPress, detailed = false }: CategoryEnvelopeRowProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation(['budget', 'common']);
  const name = displayCategoryName(envelope.categoryName);
  const icon = getTransactionIcon('expense', envelope.categoryName);
  const status = healthDisplay(envelope.health, c);
  const unbudgeted = envelope.available <= 0;
  const isOver = envelope.remaining < 0;
  const showRunRate = detailed || envelope.health !== 'on_track';

  return (
    <Pressable
      testID={`envelope-row-${envelope.categoryId}`}
      accessibilityRole="button"
      accessibilityLabel={t('envelope.a11y', { category: name, status: status.label })}
      onPress={onPress}
      style={[styles.row, first && styles.rowFirst]}
    >
      <View style={styles.header}>
        <Typography style={styles.icon}>{icon ?? '•'}</Typography>
        <View style={styles.title}>
          <View style={styles.nameRow}>
            <Typography>{name}</Typography>
            {envelope.rolloverEnabled && !unbudgeted ? (
              <View
                testID={`envelope-rollover-${envelope.categoryId}`}
                accessible
                accessibilityLabel={t('envelope.rollsOver')}
              >
                <Icon name="rollover" size={ICON_SIZE.sm} color={c.PRIMARY_TEXT} />
              </View>
            ) : null}
          </View>
          {unbudgeted ? (
            <Typography variant="muted">{t('envelope.noBudget')}</Typography>
          ) : detailed ? (
            <Typography variant="muted">
              {t('envelope.spentOf', {
                spent: formatCurrency(envelope.spent),
                available: formatCurrency(envelope.available),
              })}
            </Typography>
          ) : null}
        </View>
        <View style={styles.amounts}>
          <Typography style={[styles.remaining, isOver && styles.remainingOver]}>
            {unbudgeted
              ? formatCurrency(envelope.spent)
              : formatCurrency(Math.abs(envelope.remaining))}
          </Typography>
          <Typography variant="muted" style={styles.remainingCaption}>
            {unbudgeted ? t('envelope.spent') : isOver ? t('envelope.over') : t('envelope.left')}
          </Typography>
        </View>
      </View>

      {unbudgeted ? null : (
        <>
          <ProgressBar
            testID={`envelope-meter-${envelope.categoryId}`}
            value={Math.min(100, envelope.consumedPct)}
            marker={(envelope.expectedToDate / envelope.available) * 100}
            color={status.color}
            style={styles.meter}
          />

          {showRunRate ? (
          <View style={styles.footer}>
            <Typography variant="muted" style={styles.footerText}>
              {t('envelope.usedPerDay', {
                percent: Math.round(envelope.consumedPct),
                daily: formatCurrency(Math.round(envelope.dailyAverage)),
              })}
            </Typography>
            <Typography
              variant="muted"
              testID={`envelope-projected-${envelope.categoryId}`}
              style={[
                styles.footerText,
                envelope.projected > envelope.available && styles.footerAlert,
              ]}
            >
              {t('envelope.headingFor', { amount: formatCurrency(Math.round(envelope.projected)) })}
            </Typography>
          </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    paddingTop: SPACING.lg,
    marginTop: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.BORDER,
    gap: SPACING.sm,
  },
  rowFirst: {
    borderTopWidth: 0,
    marginTop: SPACING.md,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  icon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  title: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  remaining: {
    color: c.TEXT_PRIMARY,
    fontSize: 16,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
  },
  remainingOver: {
    color: c.DANGER,
  },
  remainingCaption: {
    fontSize: 11,
  },
  meter: {
    height: 6,
    marginTop: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  footerText: {
    fontSize: 11,
  },
  footerAlert: {
    color: c.DANGER_TEXT,
  },
});
