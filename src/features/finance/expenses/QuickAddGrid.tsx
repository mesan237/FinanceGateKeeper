import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/Toast';
import { Typography } from '@/components/Typography';
import { getCategoryAvatar, getTransactionIcon } from '@/constants/categoryIcons';
import { BORDER, PRIMARY_GREEN, SURFACE, TEXT_INVERSE, TEXT_MUTED } from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { OverBudgetAlert } from '@/features/finance/budget/OverBudgetAlert';
import { useOverBudgetCheck } from '@/features/finance/budget/budget.hooks';
import { formatCurrency } from '@/utils/formatCurrency';

import { QuickAddTemplateForm } from './QuickAddTemplateForm';
import { useCategories, useQuickAdd } from './expenses.hooks';
import type { QuickAddTemplate } from './expenses.types';

/** Sentinel appended to the grid for the create-template tile. */
const ADD_TILE = { kind: 'add' as const };
type GridItem = QuickAddTemplate | typeof ADD_TILE;

type ModalState =
  | { mode: 'idle' }
  | { mode: 'create' }
  | { mode: 'edit'; template: QuickAddTemplate };

export interface QuickAddGridProps {
  /** Called after a tile successfully logs an expense (e.g. to refresh a feed). */
  onLogged?: () => void;
  /**
   * Whether the grid provides its own vertical scroll. Default `true` (the
   * standalone `QuickAddScreen`). Pass `false` when embedded in a parent that
   * already scrolls — e.g. the `AddTransactionSheet` inside `BottomSheet` —
   * since a scroll container nested in another with the same orientation breaks
   * windowing.
   */
  scrollable?: boolean;
}

/**
 * The Quick Add grid: a two-column grid of one-tap template tiles plus a
 * trailing "+" tile. Tapping a tile logs the expense instantly and flashes a
 * transient confirmation; long-pressing opens the edit modal. Shared between
 * `QuickAddScreen` and the unified `AddTransactionSheet`.
 */
export function QuickAddGrid({ onLogged, scrollable = true }: QuickAddGridProps) {
  const { templates, add, update, remove, log } = useQuickAdd();
  const { labelFor } = useCategories();
  const { check } = useOverBudgetCheck();
  const { show } = useToast();
  const [modal, setModal] = useState<ModalState>({ mode: 'idle' });
  // Holds the template awaiting confirmation while the over-budget warning shows.
  const [pending, setPending] = useState<{ template: QuickAddTemplate; overage: number } | null>(
    null,
  );

  const performLog = async (template: QuickAddTemplate) => {
    const id = await log(template.id);
    if (id !== null) {
      show(`Logged ${formatCurrency(template.amount)} · ${template.label}`);
      onLogged?.();
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

  const renderTile = (item: GridItem) => {
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
    const emoji = getTransactionIcon('expense', labelFor(item.categoryId, null));
    const avatar = emoji ? null : getCategoryAvatar(item.label);
    return (
      <Pressable
        accessibilityRole="button"
        testID={`quick-add-tile-${item.id}`}
        style={styles.tile}
        onPress={() => handleLog(item)}
        onLongPress={() => setModal({ mode: 'edit', template: item })}
      >
        {emoji ? (
          <Typography testID={`tile-icon-${item.id}`} style={styles.tileEmoji}>
            {emoji}
          </Typography>
        ) : avatar ? (
          <View
            testID={`tile-avatar-${item.id}`}
            style={[styles.tileAvatarCircle, { backgroundColor: avatar.color }]}
          >
            <Typography style={styles.tileAvatarLetter}>{avatar.letter}</Typography>
          </View>
        ) : null}
        <Typography style={styles.tileLabel}>{item.label}</Typography>
        <Typography style={styles.tileAmount}>{formatCurrency(item.amount)}</Typography>
      </Pressable>
    );
  };

  const grid = (
    <View style={styles.grid}>
      {data.map((item) => (
        <View key={'kind' in item ? 'add-tile' : String(item.id)} style={styles.cell}>
          {renderTile(item)}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Typography variant="muted">Tap to log instantly · long-press a tile to edit</Typography>

      {scrollable ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {grid}
        </ScrollView>
      ) : (
        grid
      )}

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
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  cell: {
    width: '48%',
    marginBottom: 12,
  },
  tile: {
    minHeight: 88,
    borderRadius: RADIUS.md,
    padding: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
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
    fontFamily: FONT_FAMILY.POPPINS_BOLD,
  },
  tileEmoji: { fontSize: 28, lineHeight: 32, marginBottom: 4 },
  tileAvatarCircle: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileAvatarLetter: { color: TEXT_INVERSE, fontSize: 13, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  tileLabel: {
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  tileAmount: {
    color: TEXT_MUTED,
    marginTop: 4,
  },
});
