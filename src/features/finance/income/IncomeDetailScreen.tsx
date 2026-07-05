import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { useToast } from '@/components/Toast';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE } from '@/constants/icons';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import { IncomeSourcePicker } from './IncomeSourcePicker';
import { useIncomeEdit } from './income.hooks';

export interface IncomeDetailScreenProps {
  incomeId: number;
}

/**
 * Detail/edit form for an existing income row (VS-20). While the row is held
 * (`pending`) every field is editable, it can be deleted, and "Allocate now"
 * jumps into the VS-19 allocation flow. Once allocated, amount and date render
 * read-only (the service enforces the same lock) and only metadata — source,
 * note, account — can still be corrected.
 */
export function IncomeDetailScreen({ incomeId }: IncomeDetailScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const edit = useIncomeEdit(incomeId);
  const { show } = useToast();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await edit.update();
      if (ok) {
        show('Income updated');
        router.back();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleteModalVisible(false);
    const ok = await edit.remove();
    if (ok) {
      show('Income deleted');
      router.back();
    }
  };

  const handleAllocateNow = async () => {
    // Persist any in-form edits first: the allocation flow deposits from the
    // amount it is handed and Confirm locks the row, so navigating with
    // unsaved values would desynchronise deposits from the stored row —
    // past the point the service-layer lock can protect.
    setSaving(true);
    try {
      const ok = await edit.update();
      if (!ok) return;
      router.push({
        pathname: '/income/allocate',
        params: {
          amount: String(Math.trunc(Number(edit.amount))),
          month: edit.date.slice(0, 7),
          incomeId: String(incomeId),
        },
      });
    } finally {
      setSaving(false);
    }
  };

  if (edit.notFound) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Income" />
        <Typography variant="muted">Income not found.</Typography>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Edit Income" />

      {edit.isAllocated ? (
        <View testID="allocated-lock" style={styles.lockedBlock}>
          <Typography variant="label">Amount</Typography>
          <Typography style={styles.lockedAmount}>
            {formatCurrency(Math.trunc(Number(edit.amount)) || 0)}
          </Typography>
          <Typography variant="muted">{edit.date ? formatDateShort(edit.date) : ''}</Typography>
          <Typography variant="muted" style={styles.lockedHint}>
            Allocated income can&apos;t change amount or date — its deposits and budget share are
            already counted.
          </Typography>
        </View>
      ) : (
        <AmountInput value={edit.amount} onChangeText={edit.setAmount} />
      )}

      <IncomeSourcePicker value={edit.source} onChange={edit.setSource} />

      <TextInput
        value={edit.note}
        onChangeText={edit.setNote}
        placeholder="Note (optional)"
        accessibilityLabel="Note"
      />

      {edit.isAllocated ? null : (
        <DateField value={edit.date} onChange={edit.setDate} testID="income-detail-date" />
      )}

      <AccountPicker
        testID="income-detail-account"
        label="Account"
        value={edit.accountId}
        onChange={edit.setAccountId}
      />

      <Button label="Save" onPress={handleSave} disabled={!edit.canSubmit} loading={saving} />

      {edit.isAllocated ? null : (
        <>
          <Button
            testID="allocate-now"
            label="Allocate now"
            variant="secondary"
            onPress={handleAllocateNow}
          />
          <Button
            testID="delete-income"
            label="Delete income"
            variant="danger"
            onPress={() => setDeleteModalVisible(true)}
          />
        </>
      )}

      {edit.error ? (
        <View style={styles.errorRow}>
          <Icon name="alert" size={ICON_SIZE.sm} color={c.DANGER} />
          <Typography style={styles.error}>{edit.error}</Typography>
        </View>
      ) : null}

      <Modal visible={deleteModalVisible} onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.deleteModal}>
          <Typography variant="subheading">Delete income?</Typography>
          <Typography variant="muted">
            This held income will be removed before allocation. This cannot be undone.
          </Typography>
          <Button label="Delete" onPress={handleDeleteConfirm} variant="danger" />
          <Button
            testID="delete-modal-cancel"
            label="Cancel"
            onPress={() => setDeleteModalVisible(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  lockedBlock: {
    gap: 2,
  },
  lockedAmount: {
    color: c.TEXT_PRIMARY,
    fontSize: 28,
    fontFamily: FONT_FAMILY.POPPINS_BOLD,
  },
  lockedHint: {
    marginTop: 6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  error: {
    color: c.DANGER,
  },
  deleteModal: {
    gap: 12,
  },
});
