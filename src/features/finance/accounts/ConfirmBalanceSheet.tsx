import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';

export interface ConfirmBalanceSheetProps {
  visible: boolean;
  /** Wallet name, for the title. */
  name: string;
  /** What the app currently computes; the field starts from it. */
  balance: number;
  onConfirm: (actual: number) => Promise<void>;
  onClose: () => void;
}

/**
 * "What does MTN MoMo hold today?" (VS-42). The user types the real balance;
 * later entries count from it. Starts from the computed balance so a wallet
 * that is already right takes one tap to confirm.
 */
export function ConfirmBalanceSheet({ visible, name, balance, onConfirm, onClose }: ConfirmBalanceSheetProps) {
  const { t } = useTranslation(['accounts', 'common']);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setAmount(String(Math.max(0, balance)));
  }, [visible, balance]);

  const actual = Math.trunc(Number(amount));
  const valid = amount !== '' && Number.isFinite(actual) && actual >= 0;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onConfirm(actual);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="confirm-balance-sheet">
      <View style={styles.body}>
        <Typography variant="subheading">{t('check.title', { name })}</Typography>
        <Typography variant="muted">{t('check.hint')}</Typography>
        <AmountInput value={amount} onChangeText={setAmount} testID="confirm-balance-amount" />
        <Button
          testID="confirm-balance-save"
          label={t('check.save')}
          onPress={save}
          disabled={!valid}
          loading={saving}
        />
        <Button label={t('common:actions.cancel')} variant="ghost" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
});
