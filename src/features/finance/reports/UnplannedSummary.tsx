import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import type { UnplannedSummary as UnplannedSummaryData } from './reports.types';

export interface UnplannedSummaryProps {
  summary: UnplannedSummaryData;
}

/**
 * The month's imprévus, at the foot of "Why you spent" on Reports (UX-14; it
 * was a card of its own): how many there were, what they cost, their share of
 * the month's spending, and last month's figures beside them. A month without
 * any says so and explains how to mark one. The count covers every expense
 * marked unexpected, including one tagged with an event, which the bar above
 * counts under Events.
 */
export function UnplannedSummary({ summary }: UnplannedSummaryProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('reports');
  const { count, total, sharePct, previous } = summary;

  return (
    <View testID="why-unplanned" style={styles.body}>
      {count === 0 ? (
        <>
          <Typography>{t('unplanned.none')}</Typography>
          <Typography variant="muted">{t('unplanned.hint')}</Typography>
        </>
      ) : (
        <>
          <View style={styles.row}>
            <Typography>{t('unplanned.count', { count })}</Typography>
            <Typography testID="unplanned-total" style={styles.total}>
              {formatCurrency(total)}
            </Typography>
          </View>
          <Typography variant="muted">
            {sharePct < 1
              ? t('unplanned.shareUnderOne')
              : t('unplanned.share', { percent: Math.round(sharePct) })}
          </Typography>
        </>
      )}

      {previous.count > 0 ? (
        <Typography variant="muted">
          {t('unplanned.previous', {
            count: previous.count,
            amount: formatCurrency(previous.total),
          })}
        </Typography>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    body: { gap: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    total: { color: c.WARNING_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  });
