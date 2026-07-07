import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { Typography } from '@/components/Typography';
import { getCategoryAvatar, getTransactionIcon } from '@/constants/categoryIcons';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { OverBudgetAlert } from '@/features/finance/budget/OverBudgetAlert';
import { useOverBudgetCheck } from '@/features/finance/budget/budget.hooks';
import { formatCurrency } from '@/utils/formatCurrency';
import { toISODate } from '@/utils/formatDate';

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
 * trailing "+" tile. Tapping a tile opens a small confirm sheet (date only,
 * defaulting to today) before logging the expense; long-pressing opens the
 * edit modal. Shared between `QuickAddScreen` and the unified
 * `AddTransactionSheet`.
 */
export function QuickAddGrid({ onLogged, scrollable = true }: QuickAddGridProps) {
  const styles = useThemedStyles(makeStyles);
  const { templates, add, update, remove, log } = useQuickAdd();
  const { labelFor } = useCategories();
  const { check } = useOverBudgetCheck();
  const { show } = useToast();
  const [modal, setModal] = useState<ModalState>({ mode: 'idle' });
  // The template awaiting date confirmation before it's logged.
  const [confirming, setConfirming] = useState<QuickAddTemplate | null>(null);
  const [confirmDate, setConfirmDate] = useState(() => toISODate(new Date()));
  // Holds the template awaiting confirmation while the over-budget warning shows.
  const [pending, setPending] = useState<{
    template: QuickAddTemplate;
    date: string;
    overage: number;
  } | null>(null);

  const performLog = async (template: QuickAddTemplate, dateISO: string) => {
    const id = await log(template.id, dateISO);
    if (id !== null) {
      show(`Logged ${formatCurrency(template.amount)} · ${template.label}`);
      onLogged?.();
    }
  };

  const openConfirm = (template: QuickAddTemplate) => {
    setConfirmDate(toISODate(new Date()));
    setConfirming(template);
  };

  const handleConfirmLog = async () => {
    if (!confirming) return;
    const template = confirming;
    const dateISO = confirmDate;
    setConfirming(null);
    const result = await check(template.amount);
    if (result.isOver) {
      setPending({ template, date: dateISO, overage: result.overage });
      return;
    }
    await performLog(template, dateISO);
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
        onPress={() => openConfirm(item)}
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
      <Typography variant="muted">Tap to log · long-press a tile to edit</Typography>

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

      <Modal visible={confirming !== null} onRequestClose={() => setConfirming(null)}>
        <View style={styles.confirmForm}>
          <Typography variant="subheading">{confirming?.label}</Typography>
          <Typography variant="muted">
            {confirming ? formatCurrency(confirming.amount) : ''}
          </Typography>

          <DateField value={confirmDate} onChange={setConfirmDate} testID="quick-add-confirm-date" />

          <Button label="Log" onPress={handleConfirmLog} testID="quick-add-confirm-log" />
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => setConfirming(null)}
            testID="quick-add-confirm-cancel"
          />
        </View>
      </Modal>

      <OverBudgetAlert
        visible={pending !== null}
        overage={pending?.overage ?? 0}
        onProceed={() => {
          const template = pending?.template;
          const date = pending?.date;
          setPending(null);
          if (template && date) void performLog(template, date);
        }}
        onCancel={() => setPending(null)}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    gap: 8,
  },
  confirmForm: {
    gap: 12,
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
    backgroundColor: c.SURFACE,
    borderWidth: 1,
    borderColor: c.BORDER,
    justifyContent: 'center',
  },
  addTile: {
    alignItems: 'center',
    borderStyle: 'dashed',
    borderColor: c.PRIMARY_GREEN,
  },
  addLabel: {
    color: c.PRIMARY_GREEN,
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
  tileAvatarLetter: { color: c.TEXT_INVERSE, fontSize: 13, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  tileLabel: {
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  tileAmount: {
    color: c.TEXT_MUTED,
    marginTop: 4,
  },
});
