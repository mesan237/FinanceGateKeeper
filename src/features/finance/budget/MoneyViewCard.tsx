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
import { formatDateShort } from '@/utils/formatDate';

import { BudgetBreakdownSheet, type BreakdownLine } from './BudgetBreakdownSheet';
import type { MoneyView } from './budget.types';

/** The sources of committed money, in the order the breakdown names them. */
const COMMITTED_PARTS = ['recurring', 'planned', 'debts', 'tontines'] as const;

export interface MoneyViewCardProps {
  money: MoneyView;
  /** Opens the wallets to confirm balances; offered when they are not fresh (UX-21). */
  onCheckBalances: () => void;
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
 *
 * Under it, how fresh the wallet balances are (UX-21): free cash is only as
 * true as the wallet confirmed longest ago, and blind to spending outside every
 * wallet. When either makes the figure doubtful, "Check balances" opens the
 * wallets.
 */
export function MoneyViewCard({ money, onCheckBalances }: MoneyViewCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('budget');
  const [open, setOpen] = useState(false);
  const { committed } = money;
  const { freshness, unassigned } = money;
  const doubtful = freshness.stale || unassigned.count > 0;
  const freshnessLine =
    freshness.checkedOn === null
      ? freshness.unchecked > 0
        ? t('money.neverChecked')
        : null
      : freshness.stale
        ? t('money.notSince', { date: formatDateShort(freshness.checkedOn) })
        : freshness.daysSince === 0
          ? t('money.checkedToday')
          : t('money.checkedAgo', { count: freshness.daysSince ?? 0 });
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
          {freshnessLine ? (
            <Typography variant="muted" style={freshness.stale && styles.doubt} testID="money-freshness">
              {freshnessLine}
            </Typography>
          ) : null}
          {unassigned.count > 0 ? (
            <Typography variant="muted" style={styles.doubt} testID="money-unassigned">
              {t('money.unassigned', { count: unassigned.count })}
            </Typography>
          ) : null}
          {doubtful ? (
            <Pressable
              testID="money-check-balances"
              accessibilityRole="button"
              onPress={onCheckBalances}
              hitSlop={8}
              style={styles.link}
            >
              <Typography style={styles.linkText}>{t('money.checkBalances')}</Typography>
              <Icon name="forward" size={ICON_SIZE.sm} color={c.PRIMARY_TEXT} />
            </Pressable>
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
    doubt: { color: c.WARNING_TEXT },
    link: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, alignSelf: 'flex-start' },
    linkText: { color: c.PRIMARY_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  });
