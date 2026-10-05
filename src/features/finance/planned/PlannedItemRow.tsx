import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { DueBadge } from './DueBadge';
import { dueStatus, needsAttention, todayISO } from './planned.due';
import type { PlannedItem } from './planned.types';

export interface PlannedItemRowProps {
  item: PlannedItem;
  /** The item's category as shown to the user. */
  categoryLabel: string;
  /** When the item falls due — its own date, else the list's; null if neither. */
  dueDate: string | null;
  /** Ticks a planned item (opens the purchase sheet) or unticks a bought one. */
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Opens the postpone sheet for an item that needs attention. */
  onPostpone: () => void;
}

/**
 * One line of a shopping list: a checkbox, the item name and category, and its
 * amount. A bought item is struck through and shows what was actually paid
 * instead of the estimate. An open item due soon, today or overdue carries a
 * due badge and a Postpone action; one with its own date shows that date.
 */
export function PlannedItemRow({
  item,
  categoryLabel,
  dueDate,
  onToggle,
  onEdit,
  onDelete,
  onPostpone,
}: PlannedItemRowProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation('planned');

  const attention =
    !item.isBought && dueDate !== null && needsAttention(dueStatus(dueDate, todayISO()));
  const showDue = !item.isBought && dueDate !== null && (attention || item.plannedDate !== null);

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
        {showDue ? (
          <View style={styles.dueRow}>
            <DueBadge dateISO={dueDate} testID={`planned-due-${item.id}`} />
            {attention ? (
              <Pressable
                testID={`planned-postpone-${item.id}`}
                accessibilityRole="button"
                onPress={onPostpone}
                hitSlop={8}
              >
                <Typography style={styles.postpone}>{t('postpone.action')}</Typography>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      <Typography variant="muted">{amountLabel}</Typography>

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
    dueRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    postpone: { color: c.PRIMARY_GREEN, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  });
