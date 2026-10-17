import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { useToast } from '@/components/Toast';
import { Typography } from '@/components/Typography';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';


import { AccountPicker } from './AccountPicker';
import { useTransferLog } from './accounts.hooks';

export interface TransferLogScreenProps {
  /** The transfer to edit; omitted to log a new one (VS-43). */
  transferId?: number;
  /** Pre-selected destination for a new transfer, e.g. a goal's wallet (VS-48). */
  toAccountId?: number;
}

/**
 * Logs an account-to-account transfer: from-account (defaults to the default
 * wallet), to-account, amount, date, and an optional note. Saving the same
 * account on both sides is blocked with an inline error. On success it logs the
 * transfer and returns to the previous screen.
 *
 * Given a `transferId` it edits that transfer instead, pre-filled, with a
 * confirm-guarded Delete (VS-43).
 */
export function TransferLogScreen({ transferId, toAccountId }: TransferLogScreenProps = {}) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const transfer = useTransferLog(transferId, toAccountId);
  const { show } = useToast();
  const { t } = useTranslation(['accounts', 'common']);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const sameAccount =
    transfer.fromId !== null && transfer.toId !== null && transfer.fromId === transfer.toId;

  const handleSave = async () => {
    if (!transfer.canSubmit || saving) return;
    setSaving(true);
    const ok = await transfer.submit();
    if (ok) {
      show(t(transfer.isEditing ? 'transfer.updated' : 'transfer.logged'));
      router.back();
    } else {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmingDelete(false);
    if (await transfer.remove()) {
      show(t('transfer.removed'));
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t(transfer.isEditing ? 'transfer.editTitle' : 'transfer.title')}
        cancelLabel={t('common:actions.cancel')}
      />

      <KeyboardAwareForm contentContainerStyle={styles.fields}>
        <AccountPicker
          testID="transfer-from"
          label={t('transfer.from')}
          value={transfer.fromId}
          onChange={transfer.setFromId}
        />
        <AccountPicker
          testID="transfer-to"
          label={t('transfer.to')}
          value={transfer.toId}
          onChange={transfer.setToId}
        />

        {sameAccount ? (
          <Typography style={styles.error}>{t('transfer.sameAccount')}</Typography>
        ) : null}

        <TextInput
          testID="transfer-amount"
          placeholder={t('transfer.amountPlaceholder')}
          keyboardType="number-pad"
          value={transfer.amount}
          onChangeText={transfer.setAmount}
          accessibilityLabel={t('transfer.amount')}
        />
        <TextInput
          testID="transfer-date"
          placeholder={t('transfer.datePlaceholder')}
          value={transfer.date}
          onChangeText={transfer.setDate}
          accessibilityLabel={t('transfer.date')}
        />
        <TextInput
          testID="transfer-note"
          placeholder={t('transfer.notePlaceholder')}
          value={transfer.note}
          onChangeText={transfer.setNote}
          accessibilityLabel={t('transfer.note')}
        />

        <Button label={t('common:actions.save')} onPress={handleSave} disabled={!transfer.canSubmit} loading={saving} />

        {transfer.error ? <Typography style={styles.error}>{transfer.error}</Typography> : null}

        {transfer.isEditing ? (
          <Button
            testID="transfer-delete"
            label={t('transfer.delete')}
            variant="danger"
            onPress={() => setConfirmingDelete(true)}
          />
        ) : null}
      </KeyboardAwareForm>

      <Modal visible={confirmingDelete} onRequestClose={() => setConfirmingDelete(false)}>
        <View style={styles.fields}>
          <Typography variant="subheading">{t('transfer.deleteTitle')}</Typography>
          <Typography variant="muted">{t('transfer.deleteBody')}</Typography>
          <Button
            testID="transfer-delete-confirm"
            label={t('common:actions.delete')}
            variant="danger"
            onPress={handleDelete}
          />
          <Button label={t('common:actions.cancel')} onPress={() => setConfirmingDelete(false)} />
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  fields: { gap: 12 },
  error: { color: c.DANGER },
});
