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

/** The sources of committed money, in the order the breakdown names them. */
const COMMITTED_PARTS = ['recurring', 'planned', 'debts', 'tontines'] as const;

export interface MoneyViewCardProps {
  /** What the month's plan still allows (the hero's remainder). */
  budgetLeft: number;
  money: MoneyView;
}

/**
 * "Your money now" (VS-47): the budget, the cash and the money already
 * promised, kept as separate figures. The budget is a plan, the cash is a
 * fact, and committed money is neither, so the budget is never subtracted from
 * either. Safe-to-spend (VS-49) is the one derived figure: cash outside the
 * goal wallets, less what is due by month end. When that is negative the card
 * says so in words.
 */
export function MoneyViewCard({ budgetLeft, money }: MoneyViewCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');
  const { committed } = money;

  return (
    <Card testID="money-view" style={styles.card}>
      <Typography variant="label">{t('money.title')}</Typography>

      <Figure label={t('money.budgetLeft')} hint={t('money.budgetLeftHint')} amount={budgetLeft} testID="money-budget-left" />
      <Figure label={t('money.cash')} hint={t('money.cashHint')} amount={money.cash} testID="money-cash" />
      {money.goalCash > 0 ? (
        <Typography variant="muted" testID="money-goal-cash">
          {t('money.goalCash', { amount: formatCurrency(money.goalCash) })}
        </Typography>
      ) : null}
      <Figure
        label={t('money.committed')}
        hint={t('money.committedHint')}
        amount={committed.total}
        testID="money-committed"
      />
      {committed.total > 0 ? (
        <Typography variant="muted">
          {COMMITTED_PARTS.filter((part) => committed[part] > 0)
            .map((part) => t(`money.parts.${part}`, { amount: formatCurrency(committed[part]) }))
            .join(' · ')}
        </Typography>
      ) : null}

      <Figure label={t('money.safe')} hint={t('money.safeHint')} amount={money.safeToSpend} testID="money-safe" />
      {money.safeToSpend < 0 ? (
        <Typography style={styles.shortfall} testID="money-shortfall">
          {t('money.shortfall', { amount: formatCurrency(-money.safeToSpend) })}
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
