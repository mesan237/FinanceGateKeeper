import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { DANGER } from '@/constants/colors';

import { ACCOUNT_PURPOSE_LABEL, ACCOUNT_TYPE_LABEL } from './accountIcons';
import { createAccount, getAccountById, updateAccount } from './accounts.service';
import type { AccountPurpose, AccountType } from './accounts.types';

const TYPE_SEGMENTS = (['cash', 'mobile_money', 'bank', 'card'] as AccountType[]).map((key) => ({
  key,
  label: ACCOUNT_TYPE_LABEL[key],
}));
const PURPOSE_SEGMENTS = (
  ['spending', 'saving', 'emergency', 'general'] as AccountPurpose[]
).map((key) => ({ key, label: ACCOUNT_PURPOSE_LABEL[key] }));

/**
 * Create/edit form for a wallet. With no `?id=` it creates; with a valid id it
 * loads the account, prefills, and updates. Collects name (required), type,
 * purpose, an optional opening balance (blank → 0), and a set-as-default toggle.
 */
export function AccountForm() {
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
      <ScreenHeader title={editId !== null ? 'Edit Account' : 'New Account'} cancelLabel="Cancel" />

      <TextInput
        testID="account-name"
        placeholder="Account name"
        value={name}
        onChangeText={setName}
        accessibilityLabel="Account name"
      />

      <Typography variant="muted">Type</Typography>
      <SegmentedControl
        testID="account-type"
        segments={TYPE_SEGMENTS}
        value={type}
        onChange={(key) => setType(key as AccountType)}
      />

      <Typography variant="muted">Purpose</Typography>
      <SegmentedControl
        testID="account-purpose"
        segments={PURPOSE_SEGMENTS}
        value={purpose}
        onChange={(key) => setPurpose(key as AccountPurpose)}
      />

      <TextInput
        testID="account-balance"
        placeholder="Current balance — leave blank to start from 0"
        keyboardType="number-pad"
        value={balance}
        onChangeText={setBalance}
        accessibilityLabel="Opening balance"
      />

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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  toggle: { paddingVertical: 8 },
  error: { color: DANGER },
});
