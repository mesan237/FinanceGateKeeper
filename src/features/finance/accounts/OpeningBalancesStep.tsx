import i18n from 'i18next';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { ICON_SIZE } from '@/constants/icons';
import { SPACING } from '@/constants/layout';
import { useTheme } from '@/theme';

import { ACCOUNT_TYPE_ICON } from './accountIcons';
import { confirmBalance } from './accounts.checks';
import { useAccounts } from './accounts.hooks';

export interface OpeningBalancesStepProps {
  /** Called once the filled-in balances are saved (or when none were). */
  onDone: () => void;
}

/** Reads a typed amount as whole FCFA, ignoring digit-group spaces; null when it is not one. */
function parseAmount(text: string): number | null {
  const digits = text.replace(/[\s  ]/g, '');
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

/**
 * The wallets step of first-run set-up (UX-08): one field per active wallet
 * for what it holds today. Each amount filled in becomes a dated balance check
 * (VS-42), so balances are right from the first day; a blank wallet is left
 * alone. Rendered by onboarding through the routing layer, so onboarding never
 * imports this slice.
 */
export function OpeningBalancesStep({ onDone }: OpeningBalancesStepProps) {
  const c = useTheme();
  const { t } = useTranslation('accounts');
  const { accounts } = useAccounts();
  const [values, setValues] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const filled: [number, number][] = [];
    for (const account of accounts) {
      const text = (values[account.id] ?? '').trim();
      if (text === '') continue;
      const amount = parseAmount(text);
      if (amount === null) {
        setError(t('errors.balanceWhole'));
        return;
      }
      filled.push([account.id, amount]);
    }
    setSaving(true);
    try {
      for (const [id, amount] of filled) await confirmBalance(id, amount);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('errors.saveFailed', { ns: 'accounts' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.body}>
      {accounts.map((account) => (
        <View key={account.id} style={styles.row}>
          <Icon name={ACCOUNT_TYPE_ICON[account.type]} size={ICON_SIZE.md} color={c.TEXT_SECONDARY} />
          <Typography style={styles.name}>{account.name}</Typography>
          <TextInput
            testID={`opening-balance-${account.id}`}
            accessibilityLabel={t('opening.a11y', { name: account.name })}
            value={values[account.id] ?? ''}
            onChangeText={(text) => {
              setError(null);
              setValues((prev) => ({ ...prev, [account.id]: text }));
            }}
            placeholder={t('opening.placeholder')}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>
      ))}
      {error ? (
        <Typography style={{ color: c.DANGER_TEXT }} testID="opening-balances-error">
          {error}
        </Typography>
      ) : null}
      <Typography variant="muted">{t('opening.hint')}</Typography>
      <Button
        testID="opening-balances-save"
        label={t('opening.save')}
        onPress={() => void save()}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  name: { flex: 1 },
  input: { width: 140, textAlign: 'right' },
});
