import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import {
  BORDER,
  DANGER,
  PRIMARY_GREEN,
  SUCCESS_TEXT,
  SURFACE,
  TEXT_MUTED,
} from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { RecurringExpenseForm } from './RecurringExpenseForm';
import { useRecurring } from './expenses.hooks';
import type { RecurringExpense } from './expenses.types';

type ModalState =
  | { mode: 'idle' }
  | { mode: 'create' }
  | { mode: 'edit'; recurring: RecurringExpense };

/**
 * Manage screen for recurring expenses: one row per entry showing label,
 * amount, next due date, and a frequency badge, with an active toggle, a
 * "Skip next" action, Edit, and Delete (inline-confirmed). A top "+ Add
 * recurring" button opens the create form.
 */
export function RecurringExpensesScreen() {
  const { recurring, add, update, setActive, skip, remove } = useRecurring();
  const [modal, setModal] = useState<ModalState>({ mode: 'idle' });
  const [deleteTarget, setDeleteTarget] = useState<RecurringExpense | null>(null);

  const renderItem = ({ item }: { item: RecurringExpense }) => (
    <View testID={`recurring-row-${item.id}`} style={styles.row}>
      <View style={styles.rowHeader}>
        <Typography style={styles.label}>{item.label}</Typography>
        <Typography style={styles.amount}>{formatCurrency(item.amount)}</Typography>
      </View>
      <View style={styles.rowMeta}>
        <Typography style={styles.badge}>{item.frequency}</Typography>
        <Typography variant="muted">{`Next: ${formatDateShort(item.nextDueDate)}`}</Typography>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: item.isActive }}
          accessibilityLabel={`${item.isActive ? 'Deactivate' : 'Activate'} ${item.label}`}
          testID={`recurring-toggle-${item.id}`}
          onPress={() => setActive(item.id, !item.isActive)}
        >
          <Typography style={item.isActive ? styles.active : styles.inactive}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Typography>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Skip next ${item.label}`}
          testID={`recurring-skip-${item.id}`}
          disabled={!item.isActive}
          onPress={() => skip(item.id)}
        >
          <Typography style={item.isActive ? styles.action : styles.disabled}>Skip next</Typography>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${item.label}`}
          testID={`recurring-edit-${item.id}`}
          onPress={() => setModal({ mode: 'edit', recurring: item })}
        >
          <Typography style={styles.action}>Edit</Typography>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${item.label}`}
          testID={`recurring-delete-${item.id}`}
          onPress={() => setDeleteTarget(item)}
        >
          <Typography style={styles.danger}>Delete</Typography>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Recurring" />
      <Button
        label="+ Add recurring"
        onPress={() => setModal({ mode: 'create' })}
        testID="recurring-add-btn"
      />

      <FlatList
        data={recurring}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Typography variant="muted">No recurring expenses yet.</Typography>
        }
      />

      <RecurringExpenseForm
        visible={modal.mode !== 'idle'}
        recurring={modal.mode === 'edit' ? modal.recurring : null}
        onSave={async (input) => {
          if (modal.mode === 'edit') {
            await update(modal.recurring.id, input);
          } else {
            await add(input);
          }
        }}
        onClose={() => setModal({ mode: 'idle' })}
      />

      <Modal visible={deleteTarget !== null} onRequestClose={() => setDeleteTarget(null)}>
        {deleteTarget ? (
          <View style={styles.confirm}>
            <Typography variant="subheading">{`Delete "${deleteTarget.label}"?`}</Typography>
            <Typography variant="muted">
              Already-logged expenses are kept; only the schedule is removed.
            </Typography>
            <Button
              label="Delete"
              testID="recurring-delete-confirm"
              onPress={async () => {
                await remove(deleteTarget.id);
                setDeleteTarget(null);
              }}
            />
            <Button label="Cancel" onPress={() => setDeleteTarget(null)} />
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  list: {
    gap: 12,
  },
  row: {
    borderRadius: RADIUS.md,
    padding: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  amount: {
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    color: PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  active: {
    color: SUCCESS_TEXT,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  inactive: {
    color: TEXT_MUTED,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  action: {
    color: PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  disabled: {
    color: TEXT_MUTED,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  danger: {
    color: DANGER,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  confirm: {
    gap: 12,
  },
});
