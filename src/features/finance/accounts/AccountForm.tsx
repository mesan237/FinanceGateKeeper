import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Select } from '@/components/Select';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { KeyboardAwareForm } from '@/components/KeyboardAwareForm';
import { useThemedStyles, type ThemeColors } from '@/theme';


import { ACCOUNT_TYPE_ICON, accountPurposeLabel, accountTypeLabel } from './accountIcons';
import { createAccount, getAccountById, updateAccount } from './accounts.service';
import type { AccountPurpose, AccountType } from './accounts.types';

const TYPES: AccountType[] = ['cash', 'mobile_money', 'bank', 'card'];
const PURPOSES: AccountPurpose[] = ['spending', 'saving', 'emergency', 'general'];

/**
 * Create/edit form for a wallet. With no `?id=` it creates; with a valid id it
 * loads the account, prefills, and updates. Collects name (required), type,
 * purpose, an optional opening balance (blank → 0), and a set-as-default toggle.
 */
export function AccountForm() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['accounts', 'common']);
  // Built per render so the labels follow the active language.
  const typeOptions = TYPES.map((key) => ({
    key,
    label: accountTypeLabel(key),
    icon: ACCOUNT_TYPE_ICON[key],
  }));
  const purposeOptions = PURPOSES.map((key) => ({ key, label: accountPurposeLabel(key) }));
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
        setError(t('form.notFound'));
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
      setError(e instanceof Error ? e.message : i18n.t('errors.saveFailed', { ns: 'accounts' }));
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Create is a modal entry form ("Cancel"); edit is a drill-down from
          AccountDetail (back chevron) — VS-26 M3 header rule. */}
      <ScreenHeader
        title={editId !== null ? t('form.editTitle') : t('form.newTitle')}
        cancelLabel={editId !== null ? undefined : t('common:actions.cancel')}
      />

      <KeyboardAwareForm contentContainerStyle={styles.fields}>
        <TextInput
          testID="account-name"
          placeholder={t('form.name')}
          value={name}
          onChangeText={setName}
          accessibilityLabel={t('form.name')}
        />

        <Typography variant="label">{t('form.type')}</Typography>
        <Select
          testID="account-type"
          title={t('form.type')}
          options={typeOptions}
          value={type}
          onChange={(key) => setType(key as AccountType)}
        />

        <Typography variant="label">{t('form.purpose')}</Typography>
        <Select
          testID="account-purpose"
          title={t('form.purpose')}
          options={purposeOptions}
          value={purpose}
          onChange={(key) => setPurpose(key as AccountPurpose)}
        />

        <Typography variant="label">{t('form.currentBalance')}</Typography>
        <TextInput
          testID="account-balance"
          placeholder="0"
          keyboardType="number-pad"
          value={balance}
          onChangeText={setBalance}
          accessibilityLabel={t('form.openingBalance')}
        />
        <Typography variant="muted">{t('form.balanceHint')}</Typography>

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: isDefault }}
          testID="account-default-toggle"
          style={styles.toggle}
          onPress={() => setIsDefault((v) => !v)}
        >
          <Typography>
            {isDefault ? '☑' : '☐'} {t('form.setDefault')}
          </Typography>
        </Pressable>

        <Button label={t('common:actions.save')} onPress={handleSave} disabled={!canSubmit} />

        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </KeyboardAwareForm>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  fields: { gap: 12 },
  toggle: { paddingVertical: 8 },
  error: { color: c.DANGER },
});
