import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { getCategoryAvatar, getTransactionIcon } from '@/constants/categoryIcons';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import type { ExpenseEntry, IncomeEntry, TransactionEntry } from '@/types/transactions';
import { formatCurrency } from '@/utils/formatCurrency';

const ICON_BOX = 36;
/** 8-digit-hex alpha suffix (~15% opacity) for the icon container tint. */
const TINT_ALPHA = '26';

interface RowIconProps {
  entry: ExpenseEntry | IncomeEntry;
}

/**
 * Uniform tinted container for a row's icon: the mapped category/source emoji
 * when one exists, otherwise the deterministic letter avatar. Both sit on the
 * avatar colour at low opacity, so every row shares the same visual rhythm
 * regardless of which icon kind it gets.
 */
function RowIcon({ entry }: RowIconProps) {
  const styles = useThemedStyles(makeStyles);
  const label = entry.type === 'expense' ? entry.categoryLabel : entry.sourceLabel;
  const avatar = getCategoryAvatar(label);
  const emoji =
    entry.type === 'income'
      ? getTransactionIcon('income', undefined, entry.source)
      : getTransactionIcon('expense', entry.categoryLabel);

  return (
    <View style={[styles.iconBox, { backgroundColor: `${avatar.color}${TINT_ALPHA}` }]}>
      {emoji ? (
        <Typography testID={`tx-icon-${entry.type}-${entry.id}`} style={styles.iconEmoji}>
          {emoji}
        </Typography>
      ) : (
        <Typography
          testID={`tx-avatar-${entry.type}-${entry.id}`}
          style={[styles.iconLetter, { color: avatar.color }]}
        >
          {avatar.letter}
        </Typography>
      )}
    </View>
  );
}

export interface TransactionRowProps {
  item: TransactionEntry;
  /** Called with the expense id when an expense row is tapped (opens detail). */
  onPressExpense: (id: number) => void;
  /** Called with the income id when an income row is tapped (opens detail, VS-20). */
  onPressIncome: (id: number) => void;
}

/**
 * One feed row. Expense and income rows are tappable (their detail screens);
 * transfers are display-only. Direction is carried by the signed, coloured
 * amount — +green income, −red expense, muted transfers.
 */
export function TransactionRow({ item, onPressExpense, onPressIncome }: TransactionRowProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  if (item.type === 'transfer') {
    return (
      <View testID={`tx-row-transfer-${item.id}`} style={styles.row}>
        <View style={[styles.iconBox, styles.iconBoxTransfer]}>
          <Icon name="transfer" size={18} color={c.TEXT_MUTED} />
        </View>
        <Typography style={styles.label}>
          {item.fromAccountName} → {item.toAccountName}
        </Typography>
        <Typography style={styles.amountTransfer}>{formatCurrency(item.amount)}</Typography>
      </View>
    );
  }

  const isIncome = item.type === 'income';
  const label =
    item.type === 'expense' ? (item.subcategoryLabel ?? item.categoryLabel) : item.sourceLabel;

  const content = (
    <>
      <RowIcon entry={item} />
      <View style={styles.label}>
        <Typography>{label}</Typography>
        {item.accountLabel ? (
          <Typography
            testID={`tx-account-chip-${item.type}-${item.id}`}
            variant="muted"
            style={styles.accountChip}
          >
            {item.accountLabel}
          </Typography>
        ) : null}
      </View>
      <Typography style={isIncome ? styles.amountIncome : styles.amountExpense}>
        {isIncome ? `+${formatCurrency(item.amount)}` : `−${formatCurrency(item.amount)}`}
      </Typography>
    </>
  );

  if (isIncome) {
    return (
      <Pressable
        testID={`tx-row-income-${item.id}`}
        onPress={() => onPressIncome(item.id)}
        style={styles.row}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={`tx-row-expense-${item.id}`}
      onPress={() => onPressExpense(item.id)}
      style={styles.row}
    >
      {content}
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.BORDER,
  },
  iconBox: {
    width: ICON_BOX,
    height: ICON_BOX,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxTransfer: {
    backgroundColor: c.SURFACE_MUTED,
  },
  iconEmoji: {
    fontSize: 18,
    lineHeight: 24,
  },
  iconLetter: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  label: {
    flex: 1,
  },
  accountChip: {
    fontSize: 11,
    marginTop: 2,
  },
  amountIncome: {
    color: c.SUCCESS_TEXT,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  amountExpense: {
    color: c.DANGER,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  amountTransfer: {
    color: c.TEXT_MUTED,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
