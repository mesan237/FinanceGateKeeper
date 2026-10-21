import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Typography } from '@/components/Typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { toISODate } from '@/utils/formatDate';

import { WalletField } from './WalletField';
import type { DebtDirection, NewDebtPayment } from './debt.types';

export interface RepaymentSheetProps {
  visible: boolean;
  direction: DebtDirection;
  /** What is still owed; the amount starts here, so a full repayment is one tap. */
  outstanding: number;
  /** The account the repayment starts on (the loan's account, else the default). */
  accountId: number | null;
  /** Pays exactly this — an instalment (VS-54): the amount is shown, not typed. */
  fixedAmount?: number;
  /** Replaces the title, e.g. "Instalment 2". */
  title?: string;
  onSave: (payment: NewDebtPayment) => Promise<boolean>;
  onClose: () => void;
}

/**
 * Records one repayment (VS-44): how much, through which account, and when.
 * Paying what is still owed settles the debt.
 */
export function RepaymentSheet({
  visible,
  direction,
  outstanding,
  accountId: initialAccountId,
  fixedAmount,
  title,
  onSave,
  onClose,
}: RepaymentSheetProps) {
  const { t } = useTranslation(['debt', 'common']);
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<number | null>(initialAccountId);
  const [date, setDate] = useState(toISODate(new Date()));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount(String(fixedAmount ?? outstanding));
    setAccountId(initialAccountId);
    setDate(toISODate(new Date()));
  }, [visible, outstanding, fixedAmount, initialAccountId]);

  const value = Math.trunc(Number(amount));
  const valid = amount !== '' && Number.isFinite(value) && value > 0 && value <= outstanding;

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
    <BottomSheet visible={visible} onClose={onClose} testID="repayment-sheet">
      <View style={styles.body}>
        <Typography variant="subheading">{title ?? t('repayment.title')}</Typography>
        {fixedAmount === undefined ? (
          <AmountInput value={amount} onChangeText={setAmount} testID="repayment-amount" />
        ) : (
          <Typography testID="repayment-fixed-amount">{formatCurrency(fixedAmount)}</Typography>
        )}
        <WalletField
          testID="repayment-wallet"
          value={accountId}
          onChange={setAccountId}
          // A loan given comes back into an account; a loan received is paid from one.
          label={t(direction === 'lent' ? 'form.receivedIn' : 'form.paidFrom')}
        />
        <DateField value={date} onChange={setDate} testID="repayment-date" />
        <Button testID="repayment-save" label={t('common:actions.save')} onPress={save} disabled={!valid} loading={saving} />
        <Button label={t('common:actions.cancel')} variant="ghost" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
});
