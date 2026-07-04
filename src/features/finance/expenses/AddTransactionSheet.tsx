import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Icon } from '@/components/Icon';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { FONT_FAMILY } from '@/constants/fonts';
import { IncomeEntryPanel } from '@/features/finance/income/IncomeEntryPanel';

import { ExpenseEntryPanel } from './ExpenseEntryPanel';
import { QuickAddGrid } from './QuickAddGrid';

type Segment = 'expense' | 'income' | 'templates';

const SEGMENTS = [
  { key: 'expense', label: 'Expense' },
  { key: 'income', label: 'Income' },
  { key: 'templates', label: 'Templates' },
];

export interface AddTransactionSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called after an expense or template is logged from the sheet (refresh the feed). */
  onExpenseSaved: () => void;
  /**
   * Segment to select each time the sheet opens. Lets a caller (e.g. the
   * dashboard "Log Income" action) request a specific tab. Defaults to
   * 'expense' — the most common action.
   */
  initialSegment?: Segment;
}

/**
 * The unified add-transaction sheet: a single surface with an Expense / Income /
 * Templates toggle, opened by the Transactions-tab FAB. Each segment renders a
 * shared panel. Expense and template logs refresh the feed in place; an income
 * log closes the sheet and continues to the allocation flow.
 */
export function AddTransactionSheet({
  visible,
  onClose,
  onExpenseSaved,
  initialSegment = 'expense',
}: AddTransactionSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>(initialSegment);

  // Reseed the segment each time the sheet opens (defaults to Expense).
  useEffect(() => {
    if (visible) setSegment(initialSegment);
  }, [visible, initialSegment]);

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="add-transaction-sheet">
      <Typography variant="subheading" style={styles.title}>
        Add transaction
      </Typography>

      <SegmentedControl
        testID="add-segment"
        segments={SEGMENTS}
        value={segment}
        onChange={(key) => setSegment(key as Segment)}
      />

      <View style={styles.body}>
        {segment === 'expense' ? (
          <ExpenseEntryPanel
            onSaved={() => {
              onExpenseSaved();
              onClose();
            }}
          />
        ) : segment === 'income' ? (
          <IncomeEntryPanel
            onSaved={(amount, month) => {
              onClose();
              router.push({
                pathname: '/income/allocate',
                params: { amount: String(amount), month },
              });
            }}
          />
        ) : (
          <QuickAddGrid scrollable={false} onLogged={onExpenseSaved} />
        )}
      </View>

      <Pressable
        testID="add-transfer-link"
        accessibilityRole="button"
        style={styles.transferLink}
        onPress={() => {
          onClose();
          router.push('/transfers/log');
        }}
      >
        <Icon name="transfer" size={18} color={c.PRIMARY_GREEN} />
        <Typography style={styles.transferText}>Log a transfer between accounts</Typography>
      </Pressable>
    </BottomSheet>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    marginTop: 16,
  },
  transferLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
  },
  transferText: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
