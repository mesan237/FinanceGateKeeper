import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Select, type SelectOption } from '@/components/Select';
import { Typography } from '@/components/Typography';

import { ACCOUNT_TYPE_ICON } from './accountIcons';
import { useAccounts } from './accounts.hooks';

export interface AccountPickerProps {
  /** The selected account id, or null when none is chosen yet. */
  value: number | null;
  /** Called with the chosen account's id. */
  onChange: (id: number) => void;
  /** Optional field label shown above the trigger (e.g. "From which account?"). */
  label?: string;
  /** testID prefix; lets two pickers on one screen stay distinct (default "account-picker"). */
  testID?: string;
}

/**
 * A field that opens a modal listing the active accounts, each with its type
 * icon and a "✓ Default" marker on the default wallet. Selecting one commits its
 * id via `onChange` and closes. Used by the expense, income, transfer, fund, and
 * project screens. A thin wrapper over the shared `Select` — it maps accounts to
 * options (numeric ids ↔ string keys) and renders the optional field label.
 */
export function AccountPicker({
  value,
  onChange,
  label,
  testID = 'account-picker',
}: AccountPickerProps) {
  const { accounts } = useAccounts();

  const options: SelectOption[] = accounts.map((account) => ({
    key: String(account.id),
    label: account.name,
    icon: ACCOUNT_TYPE_ICON[account.type],
    badge: account.isDefault ? '✓ Default' : undefined,
  }));

  return (
    <View>
      {label ? (
        <Typography variant="muted" style={styles.label}>
          {label}
        </Typography>
      ) : null}

      <Select
        testID={testID}
        title="account"
        placeholder="Select account"
        options={options}
        value={value === null ? null : String(value)}
        onChange={(key) => onChange(Number(key))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
});
