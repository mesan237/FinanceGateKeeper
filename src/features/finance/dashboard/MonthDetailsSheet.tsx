import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS, SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import type { UnplannedTotals } from '@/features/finance/expenses/expenses.types';

import type { Cashflow, EverydayVsLastMonth } from './dashboard.types';

interface MonthDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** The month's name, as the card's header shows it. */
  monthName: string;
  cashflow: Cashflow;
  unplanned?: UnplannedTotals;
  /** Everyday spending now and by the same day last month (VS-95). */
  vsLastMonth?: EverydayVsLastMonth | null;
}

/**
 * What Home's month card keeps one tap away (VS-94): the money in and out so
 * far, the month's imprévus, and the two amounts behind the card's
 * "vs last month" chip (VS-95). The card itself answers one question, "where
 * do I stand?", with one figure.
 */
export function MonthDetailsSheet({
  visible,
  onClose,
  monthName,
  cashflow,
  unplanned,
  vsLastMonth,
}: MonthDetailsSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['dashboard', 'common']);

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="month-details-sheet">
      <View style={styles.body}>
        <Typography variant="subheading">{t('month.detailsTitle', { month: monthName })}</Typography>
        <View style={styles.line}>
          <Typography style={styles.grow}>{t('month.moneyIn')}</Typography>
          <Typography style={styles.amount} testID="month-details-in">
            {formatCurrency(cashflow.income)}
          </Typography>
        </View>
        <View style={styles.line}>
          <Typography style={styles.grow}>{t('month.moneyOut')}</Typography>
          <Typography style={styles.amount} testID="month-details-out">
            {formatCurrency(cashflow.expenses)}
          </Typography>
        </View>
        {vsLastMonth ? (
          <>
            <View style={styles.line}>
              <Typography style={styles.grow}>{t('month.everydayNow')}</Typography>
              <Typography style={styles.amount} testID="month-details-everyday-now">
                {formatCurrency(vsLastMonth.current)}
              </Typography>
            </View>
            <View style={styles.line}>
              <Typography style={styles.grow}>
                {t('month.everydayThen', { date: formatDateShort(vsLastMonth.lastMonthDate) })}
              </Typography>
              <Typography style={styles.amount} testID="month-details-everyday-then">
                {formatCurrency(vsLastMonth.previous)}
              </Typography>
            </View>
            <Typography variant="muted">{t('month.everydayHint')}</Typography>
          </>
        ) : null}
        {unplanned && unplanned.count > 0 ? (
          <View style={styles.unplannedRow}>
            <View style={styles.unplannedDot} />
            <Typography variant="muted" testID="month-overview-unplanned">
              {t('month.unplanned', { count: unplanned.count, amount: formatCurrency(unplanned.total) })}
            </Typography>
          </View>
        ) : null}
        <Button label={t('common:actions.close')} variant="ghost" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    body: { gap: SPACING.md },
    line: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    grow: { flex: 1 },
    amount: { fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD, color: c.TEXT_PRIMARY },
    unplannedRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    unplannedDot: { width: 8, height: 8, borderRadius: RADIUS.full, backgroundColor: c.KIND_UNEXPECTED },
  });
