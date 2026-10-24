import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE } from '@/constants/icons';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { BudgetBreakdownSheet, type BreakdownLine } from './BudgetBreakdownSheet';
import type { MoneyView } from './budget.types';

/** The sources of committed money, in the order the breakdown names them. */
const COMMITTED_PARTS = ['recurring', 'planned', 'debts', 'tontines'] as const;

export interface MoneyViewCardProps {
  money: MoneyView;
}

/**
 * Free cash (VS-47, VS-49): cash outside the goal wallets, less what is due by
 * month end. The plan's remainder is the hero above, so it is not repeated
 * here (UX-01). The budget is a plan, the cash is a fact, and committed money is
 * neither, so the budget is never subtracted from either.
 *
 * One line on the tab (UX-13); tapping it opens the subtraction — cash, goal
 * wallets, what is due and its parts — so the arithmetic can be checked. A
 * shortfall is stated on the line itself, in words.
 */
export function MoneyViewCard({ money }: MoneyViewCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('budget');
  const [open, setOpen] = useState(false);
  const { committed } = money;
  const shortfall =
    money.safeToSpend < 0 ? t('money.shortfall', { amount: formatCurrency(-money.safeToSpend) }) : null;

  const lines: BreakdownLine[] = [
    { label: t('money.cash'), hint: t('money.cashHint'), amount: money.cash, testID: 'money-cash' },
  ];
  if (money.goalCash > 0) {
    lines.push({ label: t('money.inGoals'), amount: money.goalCash, sign: 'minus', testID: 'money-goal-cash' });
  }
  lines.push({
    label: t('money.committed'),
    hint: t('money.committedHint'),
    amount: committed.total,
    sign: 'minus',
    detail:
      committed.total > 0
        ? COMMITTED_PARTS.filter((part) => committed[part] > 0)
            .map((part) => t(`money.parts.${part}`, { amount: formatCurrency(committed[part]) }))
            .join(' · ')
        : undefined,
    testID: 'money-committed',
  });

  return (
    <>
      <Pressable testID="money-view" accessibilityRole="button" onPress={() => setOpen(true)}>
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.grow}>
              <Typography variant="label">{t('money.safe')}</Typography>
              <Typography variant="muted">{t('money.safeHint')}</Typography>
            </View>
            <Typography style={styles.amount} testID="money-safe">
              {formatCurrency(money.safeToSpend)}
            </Typography>
            <Icon name="forward" size={ICON_SIZE.sm} color={c.TEXT_MUTED} />
          </View>
          {shortfall ? (
            <Typography style={styles.shortfall} testID="money-shortfall">
              {shortfall}
            </Typography>
          ) : null}
        </Card>
      </Pressable>

      <BudgetBreakdownSheet
        visible={open}
        onClose={() => setOpen(false)}
        testID="money-sheet"
        title={t('money.safe')}
        lines={lines}
        total={{ label: t('money.safe'), amount: money.safeToSpend, testID: 'money-total' }}
        note={shortfall}
      />
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: SPACING.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    grow: { flex: 1 },
    amount: { fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD },
    shortfall: { color: c.DANGER_TEXT },
  });
