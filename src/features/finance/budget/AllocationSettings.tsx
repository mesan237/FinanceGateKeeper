import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { Pill } from '@/components/Pill';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionCard } from '@/components/SectionCard';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { BUCKET_LABELS, BUCKET_VALUES, type Bucket } from '@/constants/allocation';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { RADIUS } from '@/constants/layout';
import { currentMonthISO } from '@/utils/formatDate';

import { useAllocation } from './budget.hooks';
import type { Allocation, AllocationDraft } from './budget.types';

export interface AllocationSettingsProps {
  /** Defaults to the current month (`YYYY-MM`). Override in tests. */
  monthISO?: string;
}

const TOTAL_TARGET = 100;

/**
 * Edits the four percentages and the bucket priority order for `monthISO`.
 * When the allocation is locked, fields are read-only, arrows and Save are
 * disabled, and a "Locked for this month" banner is rendered. Save is also
 * disabled until the four percentages sum to exactly `TOTAL_TARGET`.
 *
 * Reorder uses up/down arrows rather than drag-and-drop so the slice ships
 * without a new dependency (see ISSUE-006 Phase 2 Decision B).
 */
export function AllocationSettings({
  monthISO = currentMonthISO(),
}: AllocationSettingsProps) {
  const styles = useThemedStyles(makeStyles);
  const { allocation, loading, error, save } = useAllocation(monthISO);

  if (!allocation) {
    return (
      <View style={styles.loading}>
        <ScreenHeader title="Budget Settings" />
        <Typography variant="muted">{loading ? 'Loading…' : 'No allocation yet.'}</Typography>
        {error ? <Typography style={styles.error}>{error}</Typography> : null}
      </View>
    );
  }

  // `key={allocation.id}` discards form state if the underlying row is replaced,
  // so the inner form always initialises from a fresh allocation snapshot.
  return (
    <AllocationSettingsForm
      key={allocation.id}
      monthISO={monthISO}
      allocation={allocation}
      onSave={save}
      error={error}
    />
  );
}

interface AllocationSettingsFormProps {
  monthISO: string;
  allocation: Allocation;
  onSave: (draft: AllocationDraft) => Promise<void>;
  error: string | null;
}

function AllocationSettingsForm({
  monthISO,
  allocation,
  onSave,
  error,
}: AllocationSettingsFormProps) {
  const styles = useThemedStyles(makeStyles);
  const [pct, setPct] = useState<Record<Bucket, string>>(() => ({
    emergency_fund: String(allocation.emergencyFundPct),
    savings: String(allocation.savingsPct),
    projects: String(allocation.projectsPct),
    expenses: String(allocation.expensesPct),
  }));
  const [order, setOrder] = useState<Bucket[]>(() => [...allocation.priorityOrder]);

  const numericPct = useMemo(
    () => ({
      emergency_fund: Number(pct.emergency_fund) || 0,
      savings: Number(pct.savings) || 0,
      projects: Number(pct.projects) || 0,
      expenses: Number(pct.expenses) || 0,
    }),
    [pct],
  );

  const total =
    numericPct.emergency_fund +
    numericPct.savings +
    numericPct.projects +
    numericPct.expenses;

  const isLocked = allocation.isLocked;
  const canSave = !isLocked && total === TOTAL_TARGET;

  const moveUp = (bucket: Bucket) => {
    setOrder((current) => {
      const idx = current.indexOf(bucket);
      if (idx <= 0) return current;
      const next = [...current];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (bucket: Bucket) => {
    setOrder((current) => {
      const idx = current.indexOf(bucket);
      if (idx < 0 || idx >= current.length - 1) return current;
      const next = [...current];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    await onSave({
      month: monthISO,
      emergencyFundPct: numericPct.emergency_fund,
      savingsPct: numericPct.savings,
      projectsPct: numericPct.projects,
      expensesPct: numericPct.expenses,
      priorityOrder: order,
    });
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <ScreenHeader title="Budget Settings" />

      {isLocked ? (
        <View style={styles.lockedBanner}>
          <Typography style={styles.lockedText}>
            🔒 Locked for this month — comes back next month.
          </Typography>
        </View>
      ) : null}

      <SectionCard
        icon="allocation"
        title="Allocation"
        subtitle="Split each income across buckets. Must total 100%."
        right={<Pill label={`${total}%`} tone={total === TOTAL_TARGET ? 'success' : 'danger'} />}
      >
        {BUCKET_VALUES.map((bucket) => (
          <View key={bucket} style={styles.pctRow}>
            <Typography>{BUCKET_LABELS[bucket]}</Typography>
            <TextInput
              value={pct[bucket]}
              onChangeText={(text) => setPct((prev) => ({ ...prev, [bucket]: text }))}
              keyboardType="numeric"
              editable={!isLocked}
              accessibilityLabel={BUCKET_LABELS[bucket]}
              style={styles.input}
            />
          </View>
        ))}
      </SectionCard>

      <SectionCard
        icon="priority"
        title="Priority order"
        subtitle="Buckets at the top are funded first."
      >
        {order.map((bucket, index) => {
          const upDisabled = isLocked || index === 0;
          const downDisabled = isLocked || index === order.length - 1;
          return (
            <View key={bucket} style={styles.priorityRow}>
              <View style={styles.rankBadge}>
                <Typography style={styles.rankText}>{index + 1}</Typography>
              </View>
              <Typography style={styles.priorityLabel}>{BUCKET_LABELS[bucket]}</Typography>
              <View style={styles.arrows}>
                <ArrowButton
                  bucket={bucket}
                  direction="up"
                  disabled={upDisabled}
                  onPress={() => moveUp(bucket)}
                />
                <ArrowButton
                  bucket={bucket}
                  direction="down"
                  disabled={downDisabled}
                  onPress={() => moveDown(bucket)}
                />
              </View>
            </View>
          );
        })}
      </SectionCard>

      <Button label="Save" onPress={handleSave} disabled={!canSave} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </ScrollView>
  );
}

interface ArrowButtonProps {
  bucket: Bucket;
  direction: 'up' | 'down';
  disabled: boolean;
  onPress: () => void;
}

/** A square reorder control nudging a bucket up or down the priority list. */
function ArrowButton({ bucket, direction, disabled, onPress }: ArrowButtonProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <IconButton
      icon={direction === 'up' ? 'moveUp' : 'moveDown'}
      accessibilityLabel={`Move ${BUCKET_LABELS[bucket]} ${direction}`}
      testID={`move-${bucket}-${direction}`}
      disabled={disabled}
      onPress={onPress}
      style={[styles.arrow, disabled && styles.arrowDisabled]}
    />
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  pctRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  input: {
    flex: 1,
    maxWidth: 100,
    textAlign: 'right',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: c.SURFACE_MUTED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: c.TEXT_SECONDARY,
    fontSize: 12,
  },
  priorityLabel: {
    flex: 1,
  },
  arrows: {
    flexDirection: 'row',
    gap: 8,
  },
  arrow: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.BORDER,
    borderRadius: RADIUS.sm,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  lockedBanner: {
    backgroundColor: c.WARNING_LIGHT,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lockedText: {
    color: c.WARNING_TEXT,
  },
  error: {
    color: c.DANGER,
  },
});
