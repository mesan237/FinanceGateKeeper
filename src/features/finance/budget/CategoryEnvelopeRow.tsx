import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { getTransactionIcon } from '@/constants/categoryIcons';
import { FONT_FAMILY } from '@/constants/fonts';
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
}

/**
 * One category envelope in the Budget tab's list.
 *
 * Carries the full picture the brief asks for per category — allocated, spent,
 * remaining, percentage consumed, daily average and projection — but ranked so
 * a glance costs nothing: name and remaining on the first line, a paced meter on
 * the second, and the run-rate detail on the third for anyone who wants it.
 *
 * A category with no envelope but some spending renders as an "unbudgeted" row
 * rather than being hidden — silently omitting real spending would make the
 * list flatter and less honest than the month actually is.
 */
export function CategoryEnvelopeRow({ envelope, first, onPress }: CategoryEnvelopeRowProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation(['budget', 'common']);
  const name = displayCategoryName(envelope.categoryName);
  const icon = getTransactionIcon('expense', envelope.categoryName);
  const status = healthDisplay(envelope.health, c);
  const unbudgeted = envelope.available <= 0;
  const isOver = envelope.remaining < 0;

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
          <Typography>{name}</Typography>
          <Typography variant="muted">
            {unbudgeted
              ? t('envelope.noBudget')
              : t('envelope.spentOf', {
                  spent: formatCurrency(envelope.spent),
                  available: formatCurrency(envelope.available),
                })}
          </Typography>
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
              {t('envelope.endsAround', { amount: formatCurrency(Math.round(envelope.projected)) })}
            </Typography>
          </View>

          {envelope.rolloverEnabled ? (
            <Typography
              variant="muted"
              style={styles.rollover}
              testID={`envelope-rollover-${envelope.categoryId}`}
            >
              {t('envelope.rollsOver')}
            </Typography>
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
  rollover: {
    fontSize: 11,
    color: c.PRIMARY_GREEN,
  },
});
