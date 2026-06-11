import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Typography } from '@/components/Typography';
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
}

/**
 * The unified add-transaction sheet: a single surface with an Expense / Income /
 * Templates toggle, opened by the Transactions-tab FAB. Each segment renders a
 * shared panel. Expense and template logs refresh the feed in place; an income
 * log closes the sheet and continues to the allocation flow.
 */
export function AddTransactionSheet({ visible, onClose, onExpenseSaved }: AddTransactionSheetProps) {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('expense');

  // Always reopen on the Expense tab — the most common action.
  useEffect(() => {
    if (visible) setSegment('expense');
  }, [visible]);

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
          <View style={styles.templates}>
            <QuickAddGrid onLogged={onExpenseSaved} />
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    marginTop: 16,
  },
  templates: {
    height: 360,
  },
});
