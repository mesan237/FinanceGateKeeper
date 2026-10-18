import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Typography } from '@/components/Typography';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { toISODate } from '@/utils/formatDate';

/** What the sheet records: a cycle's contribution, or the payout. */
export type PaymentSheetMode = { kind: 'contribution'; cycle: number } | { kind: 'payout'; amount: number };

export interface PaymentSheetProps {
  /** Null keeps the sheet closed. */
  mode: PaymentSheetMode | null;
  /** The wallet the sheet starts on — the tontine's usual one. */
  accountId: number | null;
  onSave: (input: { amount: number; accountId: number | null; date: string }) => Promise<boolean>;
  onClose: () => void;
}

/**
 * Records one tontine payment (VS-51): which wallet it went through and when.
 * A contribution's amount is the tontine's; the payout's starts at the full
 * pot but can be lowered, since some groups keep a fee.
 */
export function PaymentSheet({ mode, accountId: initialAccountId, onSave, onClose }: PaymentSheetProps) {
  const { t } = useTranslation(['tontines', 'common']);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<number | null>(initialAccountId);
  const [date, setDate] = useState(toISODate(new Date()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mode) return;
    setAmount(mode.kind === 'payout' ? String(mode.amount) : '');
    setAccountId(initialAccountId);
    setDate(toISODate(new Date()));
  }, [mode, initialAccountId]);

  const isPayout = mode?.kind === 'payout';
  const value = Math.trunc(Number(amount));
  const valid = !isPayout || (amount !== '' && value > 0);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      if (await onSave({ amount: value, accountId, date })) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={mode !== null} onClose={onClose} testID="tontine-sheet">
      <View style={styles.body}>
        <Typography variant="subheading">
          {mode?.kind === 'contribution' ? t('sheet.payTitle', { cycle: mode.cycle }) : t('sheet.payoutTitle')}
        </Typography>
        {isPayout ? (
          <AmountInput
            value={amount}
            onChangeText={setAmount}
            accessibilityLabel={t('sheet.amount')}
            testID="tontine-sheet-amount"
          />
        ) : null}
        <AccountPicker
          testID="tontine-sheet-wallet"
          label={t(isPayout ? 'sheet.receivedIn' : 'sheet.paidFrom')}
          value={accountId}
          onChange={setAccountId}
        />
        <DateField value={date} onChange={setDate} accessibilityLabel={t('sheet.date')} testID="tontine-sheet-date" />
        <Button testID="tontine-sheet-save" label={t('sheet.save')} onPress={save} disabled={!valid} loading={saving} />
        <Button label={t('common:actions.cancel')} variant="ghost" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
});
