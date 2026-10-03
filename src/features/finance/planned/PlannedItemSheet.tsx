import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { FieldError } from '@/components/FieldError';
import { Icon } from '@/components/Icon';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { RADIUS } from '@/constants/layout';
import { AccountPicker } from '@/features/finance/accounts/AccountPicker';
import { useDefaultAccountId } from '@/features/finance/accounts/accounts.hooks';
import { CategoryPicker } from '@/features/finance/expenses/CategoryPicker';
import { useCategories } from '@/features/finance/expenses/expenses.hooks';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { toISODate } from '@/utils/formatDate';

import type { PlannedItem, PlannedItemPatch } from './planned.types';

/** The values the item form collects — the same shape `createItem`/`updateItem` take. */
export type PlannedItemValues = Required<PlannedItemPatch>;

export interface PlannedItemSheetProps {
  visible: boolean;
  /** The item being edited, or null to add a new one. */
  item: PlannedItem | null;
  onClose: () => void;
  /** Saves the values; resolves `true` on success (the sheet then closes). */
  onSubmit: (values: PlannedItemValues) => Promise<boolean>;
  /** Why the last save failed, shown inside the sheet so it is not hidden behind it. */
  error?: string | null;
}

/**
 * Add or edit a planned item: what to buy, the estimated price, its category,
 * and optionally a date and the wallet to pay from. The category is required
 * because buying the item creates an expense, and an expense needs one.
 */
export function PlannedItemSheet({
  visible,
  item,
  onClose,
  onSubmit,
  error = null,
}: PlannedItemSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} testID="planned-item-sheet">
      <ItemForm
        key={item?.id ?? 'new'}
        item={item}
        onClose={onClose}
        onSubmit={onSubmit}
        error={error}
      />
    </BottomSheet>
  );
}

interface ItemFormProps {
  item: PlannedItem | null;
  onClose: () => void;
  onSubmit: PlannedItemSheetProps['onSubmit'];
  error: string | null;
}

function ItemForm({ item, onClose, onSubmit, error }: ItemFormProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation(['planned', 'common']);
  const { displayLabelFor } = useCategories();

  const [name, setName] = useState(item?.name ?? '');
  const [amount, setAmount] = useState(item ? String(item.estimatedAmount) : '');
  const [categoryId, setCategoryId] = useState<number | null>(item?.categoryId ?? null);
  const [plannedDate, setPlannedDate] = useState<string | null>(item?.plannedDate ?? null);
  const defaultAccountId = useDefaultAccountId();
  const [chosenAccountId, setChosenAccountId] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; amount?: string; category?: string }>({});
  const [saving, setSaving] = useState(false);
  // Closes the window in which a fast double tap would save the item twice.
  const inFlight = useRef(false);

  // The item's own wallet wins, then the default one — unless the user picked.
  // The default loads asynchronously, so it is derived rather than seeded.
  const accountId = chosenAccountId ?? item?.accountId ?? defaultAccountId;

  const handleSave = async () => {
    Keyboard.dismiss();
    const value = Number(amount);
    const next = {
      name: name.trim() === '' ? t('errors.nameRequired') : undefined,
      amount: !Number.isInteger(value) || value <= 0 ? t('errors.amountWhole') : undefined,
      category: categoryId === null ? t('errors.categoryRequired') : undefined,
    };
    setErrors(next);
    if (next.name || next.amount || next.category || categoryId === null) return;

    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const ok = await onSubmit({
        name: name.trim(),
        estimatedAmount: value,
        categoryId,
        accountId,
        plannedDate,
      });
      if (ok) onClose();
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Typography variant="subheading">
        {item ? t('item.editTitle') : t('item.addTitle')}
      </Typography>

      <View>
        <Typography variant="muted" style={styles.label}>
          {t('item.nameLabel')}
        </Typography>
        <TextInput
          testID="item-name"
          value={name}
          onChangeText={setName}
          placeholder={t('item.namePlaceholder')}
          accessibilityLabel={t('item.nameLabel')}
          autoFocus={item === null}
        />
        <FieldError message={errors.name} testID="item-name-error" />
      </View>

      <View>
        <Typography variant="muted" style={styles.label}>
          {t('item.estimateLabel')}
        </Typography>
        <AmountInput
          testID="item-amount"
          accessibilityLabel={t('item.estimateLabel')}
          value={amount}
          onChangeText={setAmount}
          invalid={errors.amount !== undefined}
        />
        <FieldError message={errors.amount} testID="item-amount-error" />
      </View>

      <View>
        <Pressable
          accessibilityRole="button"
          testID="item-category"
          style={[styles.trigger, errors.category !== undefined && styles.invalid]}
          onPress={() => {
            Keyboard.dismiss();
            setPickerVisible(true);
          }}
        >
          <View style={styles.triggerContent}>
            <Icon
              name="categories"
              size={18}
              color={categoryId === null ? c.PRIMARY_GREEN : c.TEXT_PRIMARY}
            />
            <Typography style={categoryId === null ? styles.placeholder : undefined}>
              {categoryId === null ? t('item.selectCategory') : displayLabelFor(categoryId, null)}
            </Typography>
          </View>
          <Icon name="forward" size={18} color={c.TEXT_MUTED} />
        </Pressable>
        <FieldError message={errors.category} testID="item-category-error" />
      </View>

      <View>
        <Typography variant="muted" style={styles.label}>
          {t('item.dateLabel')}
        </Typography>
        {plannedDate === null ? (
          <Button
            testID="item-date-set"
            variant="secondary"
            label={t('item.setDate')}
            onPress={() => setPlannedDate(toISODate(new Date()))}
          />
        ) : (
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <DateField value={plannedDate} onChange={setPlannedDate} testID="item-date" />
            </View>
            <Button
              testID="item-date-clear"
              variant="ghost"
              label={t('item.clearDate')}
              onPress={() => setPlannedDate(null)}
            />
          </View>
        )}
      </View>

      <AccountPicker
        testID="item-account"
        label={t('item.accountLabel')}
        value={accountId}
        onChange={setChosenAccountId}
      />

      <FieldError message={error ?? undefined} testID="item-error" />

      <Button
        testID="item-save"
        label={item ? t('common:actions.save') : t('item.addTitle')}
        onPress={handleSave}
        loading={saving}
      />

      <CategoryPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(selection) => {
          // Planned items keep the parent category only; the expense they
          // create is filed under it.
          setCategoryId(selection.categoryId);
          setErrors((prev) => ({ ...prev, category: undefined }));
          setPickerVisible(false);
        }}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { gap: 10 },
    label: { marginBottom: 6 },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.BORDER_STRONG,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    triggerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    placeholder: { color: c.PRIMARY_GREEN },
    invalid: { borderColor: c.DANGER, borderWidth: 1 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dateField: { flex: 1 },
  });
