import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Toggle } from '@/components/Toggle';
import { Typography } from '@/components/Typography';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';

export interface WalletFieldProps {
  /** The chosen account, or null when the money moved through no account. */
  value: number | null;
  onChange: (accountId: number | null) => void;
  /** Picker label, e.g. "Paid from" or "Received in". */
  label: string;
  testID?: string;
}

/**
 * "Through an account" switch plus the account picker (VS-44). A loan or a
 * repayment usually moves money in or out of an account, which is what keeps
 * account balances true; switching it off covers cash handed over that is
 * already logged some other way. Switching it back on picks the default account.
 */
export function WalletField({ value, onChange, label, testID = 'wallet-field' }: WalletFieldProps) {
  const { t } = useTranslation('debt');
  const defaultAccountId = useDefaultAccountId();
  const on = value !== null;

  return (
    <View style={styles.field}>
      <View style={styles.row}>
        <Typography style={styles.grow}>{t('form.throughAccount')}</Typography>
        <Toggle
          testID={`${testID}-toggle`}
          value={on}
          accessibilityLabel={t('form.throughAccount')}
          onValueChange={(next) => onChange(next ? defaultAccountId : null)}
        />
      </View>
      {on ? <AccountPicker testID={`${testID}-account`} label={label} value={value} onChange={onChange} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
});
