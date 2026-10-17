import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import type { MoneyView } from './budget.types';

export interface MoneyViewCardProps {
  /** What the month's plan still allows (the hero's remainder). */
  budgetLeft: number;
  money: MoneyView;
}

/**
 * "Your money now" (VS-47): the budget, the cash and the money already
 * promised, kept as three separate figures. The budget is a plan, the cash is
 * a fact, and committed money is neither, so none is subtracted from another.
 * The one comparison made is the one that needs action: more due by month end
 * than the wallets hold. Safe-to-spend waits until the wallets can be trusted.
 */
export function MoneyViewCard({ budgetLeft, money }: MoneyViewCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');
  const { committed } = money;
  const shortfall = committed.total - money.cash;

  return (
    <Card testID="money-view" style={styles.card}>
      <Typography variant="label">{t('money.title')}</Typography>

      <Figure label={t('money.budgetLeft')} hint={t('money.budgetLeftHint')} amount={budgetLeft} testID="money-budget-left" />
      <Figure label={t('money.cash')} hint={t('money.cashHint')} amount={money.cash} testID="money-cash" />
      <Figure
        label={t('money.committed')}
        hint={t('money.committedHint')}
        amount={committed.total}
        testID="money-committed"
      />
      {committed.total > 0 ? (
        <Typography variant="muted">
          {t('money.breakdown', {
            recurring: formatCurrency(committed.recurring),
            planned: formatCurrency(committed.planned),
            debts: formatCurrency(committed.debts),
          })}
        </Typography>
      ) : null}

      {shortfall > 0 ? (
        <Typography style={styles.shortfall} testID="money-shortfall">
          {t('money.shortfall', { amount: formatCurrency(shortfall) })}
        </Typography>
      ) : null}
    </Card>
  );
}

interface FigureProps {
  label: string;
  hint: string;
  amount: number;
  testID: string;
}

/** One labelled figure with its one-line meaning. */
function Figure({ label, hint, amount, testID }: FigureProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row}>
      <View style={styles.grow}>
        <Typography>{label}</Typography>
        <Typography variant="muted">{hint}</Typography>
      </View>
      <Typography style={styles.amount} testID={testID}>
        {formatCurrency(amount)}
      </Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: SPACING.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    grow: { flex: 1 },
    amount: { fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD },
    shortfall: { color: c.DANGER },
  });
