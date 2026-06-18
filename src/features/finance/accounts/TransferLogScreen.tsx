import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { useToast } from '@/components/Toast';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';


import { AccountPicker } from './AccountPicker';
import { useTransferLog } from './accounts.hooks';

/**
 * Logs an account-to-account transfer: from-account (defaults to the default
 * wallet), to-account, amount, date, and an optional note. Saving the same
 * account on both sides is blocked with an inline error. On success it logs the
 * transfer and returns to the previous screen.
 */
export function TransferLogScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const transfer = useTransferLog();
  const { show } = useToast();
  const [saving, setSaving] = useState(false);

  const sameAccount =
    transfer.fromId !== null && transfer.toId !== null && transfer.fromId === transfer.toId;

  const handleSave = async () => {
    if (!transfer.canSubmit || saving) return;
    setSaving(true);
    const ok = await transfer.submit();
    if (ok) {
      show('Transfer logged');
      router.back();
    } else {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Log Transfer" cancelLabel="Cancel" />

      <AccountPicker
        testID="transfer-from"
        label="From"
        value={transfer.fromId}
        onChange={transfer.setFromId}
      />
      <AccountPicker
        testID="transfer-to"
        label="To"
        value={transfer.toId}
        onChange={transfer.setToId}
      />

      {sameAccount ? (
        <Typography style={styles.error}>Cannot transfer to the same account.</Typography>
      ) : null}

      <TextInput
        testID="transfer-amount"
        placeholder="Amount (FCFA)"
        keyboardType="number-pad"
        value={transfer.amount}
        onChangeText={transfer.setAmount}
        accessibilityLabel="Amount"
      />
      <TextInput
        testID="transfer-date"
        placeholder="Date (YYYY-MM-DD)"
        value={transfer.date}
        onChangeText={transfer.setDate}
        accessibilityLabel="Date"
      />
      <TextInput
        testID="transfer-note"
        placeholder="Note (optional)"
        value={transfer.note}
        onChangeText={transfer.setNote}
        accessibilityLabel="Note"
      />

      <Button label="Save" onPress={handleSave} disabled={!transfer.canSubmit} loading={saving} />

      {transfer.error ? <Typography style={styles.error}>{transfer.error}</Typography> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  error: { color: c.DANGER },
});
