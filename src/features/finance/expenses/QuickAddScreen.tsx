import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Typography } from '@/components/Typography';
import { PRIMARY_GREEN, SUCCESS, TEXT_MUTED } from '@/constants/colors';
import { OverBudgetAlert } from '@/features/finance/budget/OverBudgetAlert';
import { useOverBudgetCheck } from '@/features/finance/budget/budget.hooks';
import { formatCurrency } from '@/utils/formatCurrency';

import { QuickAddTemplateForm } from './QuickAddTemplateForm';
import { useQuickAdd } from './expenses.hooks';
import type { QuickAddTemplate } from './expenses.types';

/** Sentinel appended to the grid for the create-template tile. */
const ADD_TILE = { kind: 'add' as const };
type GridItem = QuickAddTemplate | typeof ADD_TILE;

type ModalState =
  | { mode: 'idle' }
  | { mode: 'create' }
  | { mode: 'edit'; template: QuickAddTemplate };

const TOAST_MS = 2000;

/**
 * The Quick Add grid: a two-column grid of one-tap template tiles plus a
 * trailing "+" tile. Tapping a tile logs the expense instantly and flashes a
 * transient confirmation; long-pressing opens the edit modal. The "+" tile
 * opens the create modal.
 */
export function QuickAddScreen() {
  const { templates, add, update, remove, log } = useQuickAdd();
  const { check } = useOverBudgetCheck();
  const [modal, setModal] = useState<ModalState>({ mode: 'idle' });
  const [toast, setToast] = useState<string | null>(null);
  // Holds the template awaiting confirmation while the over-budget warning shows.
  const [pending, setPending] = useState<{ template: QuickAddTemplate; overage: number } | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear a pending toast timer on unmount so it can't fire after teardown.
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const flashToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  const performLog = async (template: QuickAddTemplate) => {
    const id = await log(template.id);
    if (id !== null) {
      flashToast(`Logged ${formatCurrency(template.amount)} · ${template.label}`);
    }
  };

  const handleLog = async (template: QuickAddTemplate) => {
    const result = await check(template.amount);
    if (result.isOver) {
      setPending({ template, overage: result.overage });
      return;
    }
    await performLog(template);
  };

  const data: GridItem[] = [...templates, ADD_TILE];

  const renderItem = ({ item }: { item: GridItem }) => {
    if ('kind' in item) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add template"
          testID="quick-add-add-tile"
          style={[styles.tile, styles.addTile]}
          onPress={() => setModal({ mode: 'create' })}
        >
          <Typography style={styles.addLabel}>+</Typography>
        </Pressable>
      );
    }
    return (
      <Pressable
        accessibilityRole="button"
        testID={`quick-add-tile-${item.id}`}
        style={styles.tile}
        onPress={() => handleLog(item)}
        onLongPress={() => setModal({ mode: 'edit', template: item })}
      >
        <Typography style={styles.tileLabel}>{item.label}</Typography>
        <Typography style={styles.tileAmount}>{formatCurrency(item.amount)}</Typography>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Typography variant="heading">Quick Add</Typography>
      <Typography variant="muted">Tap to log instantly · long-press a tile to edit</Typography>

      <FlatList
        data={data}
        keyExtractor={(item) => ('kind' in item ? 'add-tile' : String(item.id))}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
      />

      {toast ? (
        <View style={styles.toast}>
          <Typography style={styles.toastText}>{toast}</Typography>
        </View>
      ) : null}

      <QuickAddTemplateForm
        visible={modal.mode !== 'idle'}
        template={modal.mode === 'edit' ? modal.template : null}
        onSave={async (input) => {
          if (modal.mode === 'edit') {
            await update(modal.template.id, input);
          } else {
            await add(input);
          }
        }}
        onDelete={remove}
        onClose={() => setModal({ mode: 'idle' })}
      />

      <OverBudgetAlert
        visible={pending !== null}
        overage={pending?.overage ?? 0}
        onProceed={() => {
          const template = pending?.template;
          setPending(null);
          if (template) void performLog(template);
        }}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  grid: {
    paddingTop: 12,
    gap: 12,
  },
  column: {
    gap: 12,
  },
  tile: {
    flex: 1,
    minHeight: 88,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
  },
  addTile: {
    alignItems: 'center',
    borderStyle: 'dashed',
    borderColor: PRIMARY_GREEN,
  },
  addLabel: {
    color: PRIMARY_GREEN,
    fontSize: 32,
    fontWeight: '700',
  },
  tileLabel: {
    fontWeight: '600',
  },
  tileAmount: {
    color: TEXT_MUTED,
    marginTop: 4,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: SUCCESS,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
