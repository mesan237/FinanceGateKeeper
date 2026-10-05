import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { Modal } from '@/components/Modal';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useToast } from '@/components/Toast';
import { Typography } from '@/components/Typography';
import { useCategories } from '@/features/finance/expenses/expenses.hooks';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { ListDueField } from './ListDueField';
import { PlannedItemRow } from './PlannedItemRow';
import { PlannedItemSheet, type PlannedItemValues } from './PlannedItemSheet';
import { PostponeSheet } from './PostponeSheet';
import { PurchaseConfirmSheet } from './PurchaseConfirmSheet';
import { effectiveDueDate } from './planned.due';
import { usePlannedItems } from './planned.hooks';
import type { PlannedItem } from './planned.types';

export interface PlannedListScreenProps {
  listId: number;
}

/**
 * One shopping list. Ticking an open item opens the purchase sheet, where the
 * user confirms the price actually paid; that records an expense and strikes
 * the item through. Ticking a bought item asks before undoing the purchase.
 * The list's shopping day sits at the top; items due soon or overdue can be
 * postponed. Planned items never touch the budget — only the expense a tick
 * creates does.
 */
export function PlannedListScreen({ listId }: PlannedListScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['planned', 'common']);
  const { show } = useToast();
  const { displayLabelFor } = useCategories();
  const {
    listName,
    listDueDate,
    items,
    loading,
    error,
    clearError,
    add,
    update,
    remove,
    buy,
    unbuy,
    setDueDate,
    postpone,
    removeList,
  } = usePlannedItems(listId);

  const [buying, setBuying] = useState<PlannedItem | null>(null);
  const [undoing, setUndoing] = useState<PlannedItem | null>(null);
  const [postponing, setPostponing] = useState<PlannedItem | null>(null);
  const [editing, setEditing] = useState<PlannedItem | null>(null);
  const [itemSheetOpen, setItemSheetOpen] = useState(false);
  const [deletingList, setDeletingList] = useState(false);

  const leftToBuy = items.reduce((sum, i) => (i.isBought ? sum : sum + i.estimatedAmount), 0);

  const openItemSheet = (item: PlannedItem | null) => {
    clearError();
    setEditing(item);
    setItemSheetOpen(true);
  };

  const handleSubmitItem = (values: PlannedItemValues) =>
    editing ? update(editing.id, values) : add(values);

  const handleConfirmPurchase = async (
    item: PlannedItem,
    details: Parameters<typeof buy>[1],
  ): Promise<boolean> => {
    const ok = await buy(item.id, details);
    if (ok) {
      show(
        t('purchase.recorded', { amount: formatCurrency(details.amount), name: item.name }),
      );
    }
    return ok;
  };

  const handleConfirmUndo = async () => {
    if (!undoing) return;
    const item = undoing;
    setUndoing(null);
    if (await unbuy(item.id)) show(t('undo.undone', { name: item.name }));
  };

  const handleDeleteList = async () => {
    setDeletingList(false);
    if (await removeList()) router.back();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={listName ?? t('title')}
        rightAction={
          <IconButton
            testID="planned-delete-list"
            icon="delete"
            accessibilityLabel={t('list.deleteList')}
            onPress={() => setDeletingList(true)}
          />
        }
      />

      {loading ? null : (
        <ListDueField
          dueDate={listDueDate}
          onChange={(date) => void setDueDate(date)}
          hasOpenItems={items.some((i) => !i.isBought)}
        />
      )}

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          icon="planned"
          title={t('list.emptyTitle')}
          subtitle={t('list.emptySubtitle')}
        />
      ) : (
        <>
          <Typography variant="muted">
            {leftToBuy > 0
              ? t('list.leftToBuy', { amount: formatCurrency(leftToBuy) })
              : t('lists.allBought', { count: items.length })}
          </Typography>
          <ScrollView contentContainerStyle={styles.list}>
            {items.map((item) => (
              <PlannedItemRow
                key={item.id}
                item={item}
                categoryLabel={displayLabelFor(item.categoryId, null)}
                dueDate={effectiveDueDate(item.plannedDate, listDueDate)}
                onPostpone={() => {
                  clearError();
                  setPostponing(item);
                }}
                onToggle={() => {
                  clearError();
                  if (item.isBought) setUndoing(item);
                  else setBuying(item);
                }}
                onEdit={() => openItemSheet(item)}
                onDelete={() => void remove(item.id)}
              />
            ))}
          </ScrollView>
        </>
      )}

      {error && !itemSheetOpen && buying === null ? (
        <Typography style={styles.error}>{error}</Typography>
      ) : null}

      <Button testID="planned-add-item" label={t('list.add')} onPress={() => openItemSheet(null)} />

      <PlannedItemSheet
        visible={itemSheetOpen}
        item={editing}
        onClose={() => {
          clearError();
          setItemSheetOpen(false);
        }}
        onSubmit={handleSubmitItem}
        error={error}
      />

      <PurchaseConfirmSheet
        item={buying}
        onClose={() => {
          clearError();
          setBuying(null);
        }}
        onConfirm={handleConfirmPurchase}
        error={error}
      />

      <PostponeSheet
        item={postponing}
        onClose={() => setPostponing(null)}
        onPostpone={postpone}
        onPickDate={(item, date) => update(item.id, { plannedDate: date })}
      />

      <Modal visible={undoing !== null} onRequestClose={() => setUndoing(null)}>
        <View style={styles.dialog}>
          <Typography variant="subheading">{t('undo.title')}</Typography>
          <Typography variant="muted">
            {t('undo.body', {
              amount: formatCurrency(undoing?.boughtAmount ?? 0),
              name: undoing?.name ?? '',
            })}
          </Typography>
          <Button
            testID="undo-confirm"
            variant="danger"
            label={t('undo.confirm')}
            onPress={handleConfirmUndo}
          />
          <Button
            testID="undo-cancel"
            label={t('common:actions.cancel')}
            onPress={() => setUndoing(null)}
          />
        </View>
      </Modal>

      <Modal visible={deletingList} onRequestClose={() => setDeletingList(false)}>
        <View style={styles.dialog}>
          <Typography variant="subheading">{t('list.deleteListTitle')}</Typography>
          <Typography variant="muted">{t('list.deleteListBody')}</Typography>
          <Button
            testID="delete-list-confirm"
            variant="danger"
            label={t('common:actions.delete')}
            onPress={handleDeleteList}
          />
          <Button
            testID="delete-list-cancel"
            label={t('common:actions.cancel')}
            onPress={() => setDeletingList(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 12 },
    list: { gap: 4 },
    dialog: { gap: 12 },
    error: { color: c.DANGER },
  });
