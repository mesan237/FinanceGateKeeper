import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextInput } from '@/components/TextInput';
import { Typography } from '@/components/Typography';
import { BUCKET_LABELS, BUCKET_VALUES, type Bucket } from '@/constants/allocation';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

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
      <View style={styles.container}>
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
    <View style={styles.container}>
      <ScreenHeader title="Budget Settings" />

      {isLocked ? (
        <Typography style={styles.lockedBanner}>
          🔒 Locked for this month — comes back next month.
        </Typography>
      ) : null}

      {BUCKET_VALUES.map((bucket) => (
        <View key={bucket} style={styles.row}>
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

      <Typography variant="muted">{`Total: ${total}%`}</Typography>

      <Typography variant="subheading" style={styles.priorityHeading}>
        Priority order
      </Typography>

      {order.map((bucket, index) => {

        const upDisabled = isLocked || index === 0;
        const downDisabled = isLocked || index === order.length - 1;
        return (
          <View key={bucket} style={styles.priorityRow}>
            <Typography>{BUCKET_LABELS[bucket]}</Typography>
            <View style={styles.arrows}>
              <Pressable
                testID={`move-${bucket}-up`}
                accessibilityRole="button"
                accessibilityLabel={`Move ${BUCKET_LABELS[bucket]} up`}
                accessibilityState={{ disabled: upDisabled }}
                disabled={upDisabled}
                onPress={() => moveUp(bucket)}
                style={[styles.arrow, upDisabled && styles.arrowDisabled]}
              >
                <Typography>↑</Typography>
              </Pressable>
              <Pressable
                testID={`move-${bucket}-down`}
                accessibilityRole="button"
                accessibilityLabel={`Move ${BUCKET_LABELS[bucket]} down`}
                accessibilityState={{ disabled: downDisabled }}
                disabled={downDisabled}
                onPress={() => moveDown(bucket)}
                style={[styles.arrow, downDisabled && styles.arrowDisabled]}
              >
                <Typography>↓</Typography>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Button label="Save" onPress={handleSave} disabled={!canSave} />

      {error ? <Typography style={styles.error}>{error}</Typography> : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  row: {
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
  priorityHeading: {
    marginTop: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  arrows: {
    flexDirection: 'row',
    gap: 8,
  },
  arrow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: c.TEXT_MUTED,
    borderRadius: RADIUS.sm,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  lockedBanner: {
    color: c.WARNING_TEXT,
  },
  error: {
    color: c.DANGER,
  },
});
