import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Select } from '@/components/Select';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';


import { ACCOUNT_PURPOSE_LABEL, ACCOUNT_TYPE_ICON, ACCOUNT_TYPE_LABEL } from './accountIcons';
import { createAccount, getAccountById, updateAccount } from './accounts.service';
import type { AccountPurpose, AccountType } from './accounts.types';

const TYPE_OPTIONS = (['cash', 'mobile_money', 'bank', 'card'] as AccountType[]).map((key) => ({
  key,
  label: ACCOUNT_TYPE_LABEL[key],
  icon: ACCOUNT_TYPE_ICON[key],
}));
const PURPOSE_OPTIONS = (
  ['spending', 'saving', 'emergency', 'general'] as AccountPurpose[]
).map((key) => ({ key, label: ACCOUNT_PURPOSE_LABEL[key] }));

/**
 * Create/edit form for a wallet. With no `?id=` it creates; with a valid id it
 * loads the account, prefills, and updates. Collects name (required), type,
 * purpose, an optional opening balance (blank → 0), and a set-as-default toggle.
 */
export function AccountForm() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = Number.isInteger(Number(params.id)) && Number(params.id) > 0 ? Number(params.id) : null;

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [purpose, setPurpose] = useState<AccountPurpose>('general');
  const [balance, setBalance] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId === null) return;
    void (async () => {
      const account = await getAccountById(editId);
      if (!account) {
        setError('Account not found.');
        return;
      }
      setName(account.name);
      setType(account.type);
      setPurpose(account.purpose);
      setBalance(account.openingBalance > 0 ? String(account.openingBalance) : '');
      setIsDefault(account.isDefault);
    })();
  }, [editId]);

  const canSubmit = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const fields = {
      name: name.trim(),
      type,
      purpose,
      openingBalance: balance.trim() === '' ? 0 : Math.trunc(Number(balance)),
      isDefault,
    };
    try {
      if (editId !== null) {
        await updateAccount(editId, fields);
        router.back();
      } else {
        await createAccount(fields);
        router.replace('/accounts');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save account.');
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Create is a modal entry form ("Cancel"); edit is a drill-down from
          AccountDetail (back chevron) — VS-26 M3 header rule. */}
      <ScreenHeader
        title={editId !== null ? 'Edit Account' : 'New Account'}
        cancelLabel={editId !== null ? undefined : 'Cancel'}
      />

      <TextInput
        testID="account-name"
        placeholder="Account name"
        value={name}
        onChangeText={setName}
        accessibilityLabel="Account name"
      />

      <Typography variant="label">Type</Typography>
      <Select
        testID="account-type"
        title="Type"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(key) => setType(key as AccountType)}
      />

      <Typography variant="label">Purpose</Typography>
      <Select
        testID="account-purpose"
        title="Purpose"
        options={PURPOSE_OPTIONS}
        value={purpose}
        onChange={(key) => setPurpose(key as AccountPurpose)}
      />

      <Typography variant="label">Current balance</Typography>
      <TextInput
        testID="account-balance"
        placeholder="0"
        keyboardType="number-pad"
        value={balance}
        onChangeText={setBalance}
        accessibilityLabel="Opening balance"
      />
      <Typography variant="muted">Leave blank to start from 0.</Typography>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isDefault }}
        testID="account-default-toggle"
        style={styles.toggle}
        onPress={() => setIsDefault((v) => !v)}
      >
        <Typography>{isDefault ? '☑' : '☐'} Set as default account</Typography>
      </Pressable>

      <Button label="Save" onPress={handleSave} disabled={!canSubmit} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  toggle: { paddingVertical: 8 },
  error: { color: c.DANGER },
});
