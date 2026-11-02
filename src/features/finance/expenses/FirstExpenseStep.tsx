import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useAccounts } from '@/features/finance/accounts/accounts.hooks';
import { Button } from '@/components/Button';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS, SPACING } from '@/constants/layout';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { useCategories, useExpenseLog, useZeroDay } from './expenses.hooks';

/** The seeded categories offered first; the rest wait behind "Other…". */
const EVERYDAY = ['Food', 'Transport', 'Bills', 'Health'];

export interface FirstExpenseStepProps {
  /** How the step ended: an expense saved, a no-spend day marked, or left for later. */
  onDone: (outcome: 'logged' | 'noSpend' | 'later') => void;
}

/**
 * The first-entry step of first-run set-up (VS-92): an amount, a category and a
 * wallet, so the user leaves set-up with a logged day. The purchase was paid
 * before the wallet figures were typed one screen ago, so it is saved as already
 * paid and does not come off them. No budget exists yet, so there is no
 * over-budget check. Rendered by onboarding through the routing layer, so
 * onboarding never imports this slice.
 */
export function FirstExpenseStep({ onDone }: FirstExpenseStepProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('expenses');
  const log = useExpenseLog({ entryPoint: 'onboarding', alreadyPaid: true });
  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { confirm } = useZeroDay();
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [noSpendError, setNoSpendError] = useState<string | null>(null);

  const { categoryId, setCategoryId, accountId, setAccountId } = log;
  useEffect(() => {
    if (categoryId !== null) return;
    const first = categories.find((c) => c.isDefault && c.name === EVERYDAY[0]) ?? categories[0];
    if (first) setCategoryId(first.id);
  }, [categories, categoryId, setCategoryId]);
  useEffect(() => {
    if (accountId !== null) return;
    const wallet = accounts.find((a) => a.isDefault) ?? accounts[0];
    if (wallet) setAccountId(wallet.id);
  }, [accounts, accountId, setAccountId]);

  const everyday = categories.filter((c) => c.isDefault && EVERYDAY.includes(c.name));
  const shown = showAll || everyday.length === 0 ? categories : everyday;

  const save = async () => {
    setNoSpendError(null);
    if (!log.validate()) return;
    setSaving(true);
    const id = await log.submit();
    setSaving(false);
    if (id !== null) onDone('logged');
  };

  const noSpend = async () => {
    try {
      await confirm();
      onDone('noSpend');
    } catch (e) {
      setNoSpendError(e instanceof Error ? e.message : t('errors.saveFailed'));
    }
  };

  const error = log.error ?? noSpendError;

  return (
    <View style={styles.body}>
      <View style={styles.field}>
        <Typography variant="muted">{t('firstEntry.amount')}</Typography>
        <TextInput
          testID="first-entry-amount"
          accessibilityLabel={t('firstEntry.amount')}
          value={log.amount}
          onChangeText={(text) => log.setAmount(text.replace(/\D/g, ''))}
          placeholder={t('firstEntry.placeholder')}
          keyboardType="number-pad"
          style={styles.amount}
        />
        {log.fieldErrors.amount ? <Typography style={styles.error}>{log.fieldErrors.amount}</Typography> : null}
      </View>

      <View style={styles.field}>
        <Typography variant="muted">{t('firstEntry.category')}</Typography>
        <View style={styles.chips}>
          {shown.map((category) => {
            const active = category.id === categoryId;
            return (
              <Pressable
                key={category.id}
                testID={`first-entry-category-${category.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setCategoryId(category.id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Typography style={active ? styles.chipTextActive : undefined}>
                  {displayCategoryName(category.name, category.isDefault)}
                </Typography>
              </Pressable>
            );
          })}
          {shown.length < categories.length ? (
            <Pressable
              testID="first-entry-more"
              accessibilityRole="button"
              onPress={() => setShowAll(true)}
              style={styles.chip}
            >
              <Typography>{t('firstEntry.more')}</Typography>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.walletRow}>
        <Typography variant="muted">{t('firstEntry.wallet')}</Typography>
        <AccountPicker testID="first-entry-wallet" value={accountId} onChange={setAccountId} bare />
      </View>

      {error ? (
        <Typography testID="first-entry-error" style={styles.error}>
          {error}
        </Typography>
      ) : null}

      <View style={styles.actions}>
        <Button testID="first-entry-save" label={t('firstEntry.save')} onPress={() => void save()} loading={saving} />
        <Button
          testID="first-entry-no-spend"
          label={t('firstEntry.noSpend')}
          variant="ghost"
          onPress={() => void noSpend()}
        />
        <Pressable
          testID="first-entry-later"
          accessibilityRole="button"
          onPress={() => onDone('later')}
          hitSlop={8}
          style={styles.later}
        >
          <Typography variant="muted" style={styles.laterText}>
            {t('firstEntry.later')}
          </Typography>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    body: { flexGrow: 1, gap: SPACING.lg },
    field: { gap: SPACING.sm },
    amount: {
      backgroundColor: c.SURFACE,
      fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
      fontSize: 26,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: c.BORDER,
    },
    chipActive: { backgroundColor: c.PRIMARY_FILL, borderColor: c.PRIMARY_FILL },
    chipTextActive: { color: c.TEXT_INVERSE },
    walletRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: SPACING.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.BORDER,
    },
    error: { color: c.DANGER_TEXT },
    actions: { marginTop: 'auto', gap: SPACING.sm, paddingTop: SPACING.lg },
    later: { alignItems: 'center', paddingVertical: SPACING.sm },
    laterText: { textDecorationLine: 'underline' },
  });
