import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS, SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import type { CategoryBudgetProgress } from './budget.types';

export interface EnvelopeEditSheetProps {
  /** The envelope being edited; `null` closes the sheet. */
  envelope: CategoryBudgetProgress | null;
  /** Other envelopes with budget to spare, offered as cover sources. */
  coverSources: CategoryBudgetProgress[];
  onClose: () => void;
  /** Saves a new amount and rollover flag. Resolves false if the write failed. */
  onSave: (categoryId: number, amount: number, rollover: boolean) => Promise<boolean>;
  /** Moves `amount` from another envelope into this one. */
  onCoverFrom: (fromCategoryId: number, toCategoryId: number, amount: number) => Promise<boolean>;
  onRemove: (categoryId: number) => Promise<boolean>;
  error?: string | null;
}

/**
 * Edits one category envelope in place.
 *
 * A sheet rather than a pushed screen: adjusting a budget mid-month should cost
 * one tap and keep the list underneath in view, so the change can be judged
 * against its neighbours.
 *
 * When the envelope is overspent, the sheet leads with **cover it from another
 * category** instead of only reporting the overage. Moving budget between
 * envelopes keeps the month's total honest and turns overspending into a
 * decision the user can actually act on — the difference between being warned
 * and being helped.
 */
export function EnvelopeEditSheet({
  envelope,
  coverSources,
  onClose,
  onSave,
  onCoverFrom,
  onRemove,
  error,
}: EnvelopeEditSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const [amount, setAmount] = useState('');
  const [rollover, setRollover] = useState(false);
  const [covering, setCovering] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reseed whenever a different envelope opens, so the sheet never shows the
  // previous category's figures for a frame.
  useEffect(() => {
    if (!envelope) return;
    setAmount(envelope.allocated > 0 ? String(envelope.allocated) : '');
    setRollover(envelope.rolloverEnabled);
    setCovering(false);
  }, [envelope]);

  if (!envelope) return <BottomSheet visible={false} onClose={onClose}>{null}</BottomSheet>;

  const shortfall = Math.max(0, -envelope.remaining);

  const run = async (action: () => Promise<boolean>) => {
    setBusy(true);
    try {
      if (await action()) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible onClose={onClose} testID="envelope-sheet">
      <View style={styles.sheet}>
        <Typography variant="subheading">{envelope.categoryName}</Typography>
        <Typography variant="muted">
          {`${formatCurrency(envelope.spent)} spent of ${formatCurrency(envelope.available)}`}
          {envelope.carriedIn !== 0
            ? ` · ${formatCurrency(envelope.carriedIn)} carried over`
            : ''}
        </Typography>

        {covering ? (
          <CoverPicker
            shortfall={shortfall}
            sources={coverSources}
            busy={busy}
            onPick={(fromId, moveAmount) =>
              run(() => onCoverFrom(fromId, envelope.categoryId, moveAmount))
            }
            onCancel={() => setCovering(false)}
          />
        ) : (
          <>
            {shortfall > 0 ? (
              <View style={styles.overBanner}>
                <Typography style={styles.overText}>
                  {`${formatCurrency(shortfall)} over budget`}
                </Typography>
              </View>
            ) : null}

            <View style={styles.field}>
              <Typography variant="label">Budget for this month</Typography>
              <AmountInput
                value={amount}
                onChangeText={setAmount}
                accessibilityLabel={`${envelope.categoryName} budget in FCFA`}
                testID="envelope-amount"
              />
            </View>

            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: rollover }}
              accessibilityLabel="Roll unused budget into next month"
              onPress={() => setRollover((prev) => !prev)}
              testID="envelope-rollover"
              style={[styles.toggle, rollover && styles.toggleOn]}
            >
              <View style={styles.toggleText}>
                <Typography>Roll over what is left</Typography>
                <Typography variant="muted">
                  Unused budget — or an overspend — carries into next month.
                </Typography>
              </View>
              <Typography style={styles.toggleMark}>{rollover ? '✓' : ''}</Typography>
            </Pressable>

            {shortfall > 0 && coverSources.length > 0 ? (
              <Button
                label="Cover from another category"
                variant="secondary"
                onPress={() => setCovering(true)}
                testID="envelope-cover"
              />
            ) : null}

            <Button
              label="Save"
              loading={busy}
              onPress={() =>
                void run(() =>
                  onSave(envelope.categoryId, amount ? Number(amount) : 0, rollover),
                )
              }
              testID="envelope-save"
            />

            {envelope.allocated > 0 ? (
              <Button
                label="Remove budget"
                variant="ghost"
                disabled={busy}
                onPress={() => void run(() => onRemove(envelope.categoryId))}
                testID="envelope-remove"
              />
            ) : null}
          </>
        )}

        {error ? (
          <Typography style={styles.error} testID="envelope-error">
            {error}
          </Typography>
        ) : null}
      </View>
    </BottomSheet>
  );
}

interface CoverPickerProps {
  shortfall: number;
  sources: CategoryBudgetProgress[];
  busy: boolean;
  onPick: (fromCategoryId: number, amount: number) => void;
  onCancel: () => void;
}

/**
 * Picks which envelope funds an overspend. Each source offers the smaller of
 * the shortfall and its own spare budget, so a move can never push the donor
 * envelope into deficit to rescue another.
 */
function CoverPicker({ shortfall, sources, busy, onPick, onCancel }: CoverPickerProps) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.cover} testID="envelope-cover-picker">
      <Typography variant="label">{`Cover ${formatCurrency(shortfall)} from…`}</Typography>
      {sources.map((source) => {
        const spare = Math.min(shortfall, source.remaining, source.allocated);
        return (
          <Pressable
            key={source.categoryId}
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onPick(source.categoryId, spare)}
            testID={`envelope-cover-${source.categoryId}`}
            style={styles.coverRow}
          >
            <View style={styles.coverBody}>
              <Typography>{source.categoryName}</Typography>
              <Typography variant="muted">
                {`${formatCurrency(source.remaining)} unspent`}
              </Typography>
            </View>
            <Typography style={styles.coverAmount}>{formatCurrency(spare)}</Typography>
          </Pressable>
        );
      })}
      <Button label="Back" variant="ghost" onPress={onCancel} testID="envelope-cover-cancel" />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  sheet: {
    gap: SPACING.md,
  },
  field: {
    gap: SPACING.sm,
  },
  overBanner: {
    backgroundColor: c.DANGER_LIGHT,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  overText: {
    color: c.DANGER_TEXT,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
    fontSize: 13,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: c.BORDER,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  toggleOn: {
    borderColor: c.PRIMARY_GREEN,
    backgroundColor: c.PRIMARY_LIGHT,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  toggleMark: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_BOLD,
    fontSize: 18,
  },
  cover: {
    gap: SPACING.sm,
  },
  coverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: c.BORDER,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  coverBody: {
    flex: 1,
  },
  coverAmount: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
  },
  error: {
    color: c.DANGER,
  },
});
