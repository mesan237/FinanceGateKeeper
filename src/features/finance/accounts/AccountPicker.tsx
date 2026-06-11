import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { Typography } from '@/components/Typography';
import { PRIMARY_GREEN, TEXT_MUTED } from '@/constants/colors';

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
 * project screens.
 */
export function AccountPicker({
  value,
  onChange,
  label,
  testID = 'account-picker',
}: AccountPickerProps) {
  const { accounts } = useAccounts();
  const [open, setOpen] = useState(false);

  const selected = accounts.find((a) => a.id === value) ?? null;

  const choose = (id: number) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <View>
      {label ? (
        <Typography variant="muted" style={styles.label}>
          {label}
        </Typography>
      ) : null}

      <Pressable
        accessibilityRole="button"
        testID={`${testID}-trigger`}
        style={styles.trigger}
        onPress={() => setOpen(true)}
      >
        {selected ? (
          <View style={styles.triggerContent}>
            <Icon name={ACCOUNT_TYPE_ICON[selected.type]} size={18} />
            <Typography>{selected.name}</Typography>
          </View>
        ) : (
          <Typography variant="muted">Select account</Typography>
        )}
        <Icon name="forward" size={18} color={TEXT_MUTED} />
      </Pressable>

      <Modal visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.header}>
          <Typography variant="subheading">Select account</Typography>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
            <Typography style={styles.action}>Close</Typography>
          </Pressable>
        </View>
        <ScrollView style={styles.list}>
          {accounts.map((account) => (
            <Pressable
              key={account.id}
              accessibilityRole="button"
              testID={`${testID}-option-${account.id}`}
              style={styles.row}
              onPress={() => choose(account.id)}
            >
              <Icon name={ACCOUNT_TYPE_ICON[account.type]} size={20} />
              <Typography style={styles.rowName}>{account.name}</Typography>
              {account.isDefault ? (
                <Typography
                  testID={`${testID}-default-marker-${account.id}`}
                  style={styles.defaultMarker}
                >
                  ✓ Default
                </Typography>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  triggerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  action: { color: PRIMARY_GREEN, fontWeight: '600' },
  list: { maxHeight: 320 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  rowName: { flex: 1 },
  defaultMarker: { color: PRIMARY_GREEN, fontWeight: '600', fontSize: 12 },
});
