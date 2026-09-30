import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Typography } from '@/components/Typography';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import type { PlannedItem } from './planned.types';

export interface PlannedItemRowProps {
  item: PlannedItem;
  /** The item's category as shown to the user. */
  categoryLabel: string;
  /** Ticks a planned item (opens the purchase sheet) or unticks a bought one. */
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * One line of a shopping list: a checkbox, the item name and category, and its
 * amount. A bought item is struck through and shows what was actually paid
 * instead of the estimate.
 */
export function PlannedItemRow({
  item,
  categoryLabel,
  onToggle,
  onEdit,
  onDelete,
}: PlannedItemRowProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('planned');

  const amountLabel =
    item.isBought && item.boughtAmount !== null
      ? t('list.paid', { amount: formatCurrency(item.boughtAmount) })
      : t('list.estimated', { amount: formatCurrency(item.estimatedAmount) });

  return (
    <View style={styles.row}>
      <Pressable
        testID={`planned-check-${item.id}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.isBought }}
        accessibilityLabel={
          item.isBought ? t('list.uncheck', { name: item.name }) : t('list.check', { name: item.name })
        }
        onPress={onToggle}
        hitSlop={8}
        style={[styles.checkbox, item.isBought && styles.checkboxChecked]}
      >
        {item.isBought ? <Icon name="check" size={14} color={c.TEXT_INVERSE} /> : null}
      </Pressable>

      <Pressable
        testID={`planned-edit-${item.id}`}
        accessibilityRole="button"
        // A bought item is a finished record; its expense is edited from Transactions.
        disabled={item.isBought}
        onPress={onEdit}
        style={styles.body}
      >
        <Typography style={item.isBought ? styles.nameBought : undefined}>{item.name}</Typography>
        <Typography variant="muted">{categoryLabel}</Typography>
      </Pressable>

      <Typography variant="muted" style={item.isBought ? styles.amountBought : undefined}>
        {amountLabel}
      </Typography>

      <IconButton
        testID={`planned-delete-${item.id}`}
        icon="delete"
        accessibilityLabel={t('list.deleteItem', { name: item.name })}
        onPress={onDelete}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.BORDER_STRONG,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: c.PRIMARY_GREEN, borderColor: c.PRIMARY_GREEN },
    body: { flex: 1 },
    nameBought: { textDecorationLine: 'line-through', color: c.TEXT_MUTED },
    amountBought: { textDecorationLine: 'line-through' },
  });
