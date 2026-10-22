import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChangeChip } from '@/components/ChangeChip';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { monthLabel } from '@/utils/monthMath';
import { percentChange } from '@/utils/percentChange';

import type { ProfileAverage, ProfileCategory, SpendingProfile, StartingPoint } from './reports.types';

/**
 * "Starting point" beside "Now" inside the typical-month card (VS-58): the same
 * fixed / variable / unexpected rows, each with a % change, and every category
 * on tap. Kept as one table so the card never shows the same figure twice.
 */

const ROWS: ReadonlyArray<keyof ProfileAverage> = ['total', 'fixed', 'variable', 'unexpected'];

interface CategoryChange {
  categoryId: number;
  categoryLabel: string;
  start: number;
  now: number;
}

/** Every category in either profile, biggest absolute change first. */
function categoryChanges(start: SpendingProfile, now: SpendingProfile): CategoryChange[] {
  const all = (p: SpendingProfile): ProfileCategory[] => [...p.variableCategories, ...p.fixedCategories];
  const byId = new Map<number, CategoryChange>();
  for (const c of all(start)) {
    byId.set(c.categoryId, { categoryId: c.categoryId, categoryLabel: c.categoryLabel, start: c.average, now: 0 });
  }
  for (const c of all(now)) {
    const row = byId.get(c.categoryId) ?? { categoryId: c.categoryId, categoryLabel: c.categoryLabel, start: 0, now: 0 };
    byId.set(c.categoryId, { ...row, now: c.average });
  }
  return [...byId.values()].sort((a, b) => Math.abs(b.now - b.start) - Math.abs(a.now - a.start));
}

function CompareRow({ label, start, now, testID }: { label: string; start: number; now: number; testID: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row} testID={testID}>
      <Typography style={styles.label} numberOfLines={1}>{label}</Typography>
      <Typography style={styles.amount}>{formatCurrency(start)}</Typography>
      <Typography style={[styles.amount, styles.now]}>{formatCurrency(now)}</Typography>
      <View style={styles.chip}>
        <ChangeChip change={percentChange(now, start)} />
      </View>
    </View>
  );
}

export interface StartingPointCompareProps {
  start: SpendingProfile & { average: ProfileAverage };
  now: SpendingProfile & { average: ProfileAverage };
}

/** The comparison table, plus the per-category list behind one tap. */
export function StartingPointCompare({ start, now }: StartingPointCompareProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('reports');
  const [showCategories, setShowCategories] = useState(false);

  return (
    <View testID="typical-compare" style={styles.table}>
      <View style={styles.row}>
        <View style={styles.label} />
        <Typography variant="muted" style={styles.amount}>{t('typical.startColumn')}</Typography>
        <Typography variant="muted" style={styles.amount}>{t('typical.nowColumn')}</Typography>
        <View style={styles.chip} />
      </View>
      {ROWS.map((row) => (
        <CompareRow
          key={row}
          testID={`typical-compare-${row}`}
          label={t(`typical.${row}`)}
          start={start.average[row]}
          now={now.average[row]}
        />
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showCategories }}
        onPress={() => setShowCategories((open) => !open)}
        testID="typical-compare-toggle"
      >
        <Typography style={styles.toggle}>
          {t(showCategories ? 'typical.hideCategories' : 'typical.byCategory')}
        </Typography>
      </Pressable>
      {showCategories
        ? categoryChanges(start, now).map((c) => (
            <CompareRow
              key={c.categoryId}
              testID={`typical-compare-category-${c.categoryId}`}
              label={displayCategoryName(c.categoryLabel)}
              start={c.start}
              now={c.now}
            />
          ))
        : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    table: { gap: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    label: { flex: 1 },
    amount: { width: 92, textAlign: 'right', fontSize: 13 },
    now: { fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD, color: c.TEXT_PRIMARY },
    chip: { width: 60, alignItems: 'flex-end' },
    toggle: { color: c.PRIMARY_GREEN, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD, marginTop: 4 },
  });

/** Whether the card should show the comparison table (and so drop its plain rows). */
export function canCompare(startingPoint: StartingPoint | null | undefined, now: SpendingProfile): boolean {
  if (!startingPoint?.profile?.average || !now.average) return false;
  const recorded = new Set(startingPoint.recorded);
  // Until "now" has a complete month past the starting point, both are the same months.
  return now.months.some((m) => m.isComplete && !recorded.has(m.month));
}

/**
 * The starting-point part of the card: a progress line while the three months
 * are being recorded, a note while "now" is still those same months, or the
 * months it is based on and the comparison table.
 */
export function StartingPointBlock({ startingPoint, now }: { startingPoint: StartingPoint; now: SpendingProfile }) {
  const { t } = useTranslation('reports');
  const start = startingPoint.profile;

  if (!start?.average) {
    return (
      <Typography variant="muted" testID="typical-start-progress">
        {t('typical.startProgress', { count: startingPoint.recorded.length, needed: startingPoint.needed })}
      </Typography>
    );
  }

  const months = startingPoint.recorded.map((m) => monthLabel(m)).join(', ');
  if (!canCompare(startingPoint, now) || !now.average) {
    return (
      <Typography variant="muted" testID="typical-start-same">
        {t('typical.startSame', { amount: formatCurrency(start.average.total), months })}
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="muted" testID="typical-start-months">
        {t('typical.startMonths', { months })}
      </Typography>
      <StartingPointCompare start={{ ...start, average: start.average }} now={{ ...now, average: now.average }} />
    </>
  );
}
