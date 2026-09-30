import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { Typography } from '@/components/Typography';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';
import { formatCurrency } from '@/utils/formatCurrency';
import { toISODate } from '@/utils/formatDate';

import type { PurchaseDetails } from './planned.purchase';
import type { PlannedItem } from './planned.types';

export interface PurchaseConfirmSheetProps {
  /** The item being ticked off, or null when the sheet is closed. */
  item: PlannedItem | null;
  onClose: () => void;
  /** Records the purchase; resolves `true` when the expense was created. */
  onConfirm: (item: PlannedItem, details: PurchaseDetails) => Promise<boolean>;
}

/**
 * The sheet that turns a ticked item into an expense. The estimate is prefilled
 * but it is only a guess — the user confirms (or corrects) the amount actually
 * paid, the wallet and the date, so the expense that lands in their records is
 * the real one.
 */
export function PurchaseConfirmSheet({ item, onClose, onConfirm }: PurchaseConfirmSheetProps) {
  // Keep showing the last item while the sheet animates out, so the content
  // does not blank before the slide finishes.
  const lastItem = useRef<PlannedItem | null>(item);
  if (item) lastItem.current = item;
  const shown = item ?? lastItem.current;

  return (
    <BottomSheet visible={item !== null} onClose={onClose} testID="purchase-sheet">
      {shown ? (
        <PurchaseForm key={shown.id} item={shown} onClose={onClose} onConfirm={onConfirm} />
      ) : null}
    </BottomSheet>
  );
}

interface PurchaseFormProps {
  item: PlannedItem;
  onClose: () => void;
  onConfirm: PurchaseConfirmSheetProps['onConfirm'];
}

function PurchaseForm({ item, onClose, onConfirm }: PurchaseFormProps) {
  const { t } = useTranslation(['planned', 'common']);
  const defaultAccountId = useDefaultAccountId();
  const [amount, setAmount] = useState(String(item.estimatedAmount));
  const [chosenAccountId, setChosenAccountId] = useState<number | null>(null);
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [amountError, setAmountError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The item's own wallet wins, then the default one — unless the user picked.
  const accountId = chosenAccountId ?? item.accountId ?? defaultAccountId;

  const handleConfirm = async () => {
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      setAmountError(t('purchase.amountRequired'));
      return;
    }
    setSaving(true);
    try {
      const ok = await onConfirm(item, { amount: value, accountId, date });
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Typography variant="subheading">{t('purchase.title')}</Typography>
      <Typography variant="muted">
        {item.name} · {t('purchase.estimated', { amount: formatCurrency(item.estimatedAmount) })}
      </Typography>

      <AmountInput
        testID="purchase-amount"
        accessibilityLabel={t('purchase.amountLabel')}
        value={amount}
        onChangeText={(text) => {
          setAmount(text);
          setAmountError(null);
        }}
        autoFocus
        invalid={amountError !== null}
      />
      <FieldError message={amountError ?? undefined} testID="purchase-amount-error" />

      <DateField value={date} onChange={setDate} testID="purchase-date" />

      <AccountPicker testID="purchase-account" value={accountId} onChange={setChosenAccountId} />

      <Button
        testID="purchase-confirm"
        label={t('purchase.confirm')}
        onPress={handleConfirm}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
});
