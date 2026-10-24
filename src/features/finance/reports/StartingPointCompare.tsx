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
 * on tap — each with its subcategories under it (VS-59). Kept as one table so
 * the card never shows the same figure twice.
 */

const ROWS: ReadonlyArray<keyof ProfileAverage> = ['total', 'fixed', 'variable', 'unexpected'];

interface Change {
  start: number;
  now: number;
}

interface SubcategoryChange extends Change {
  subcategoryId: number | null;
  label: string | null;
}

interface CategoryChange extends Change {
  categoryId: number;
  categoryLabel: string;
  subcategories: SubcategoryChange[];
}

/** Biggest absolute change first. */
const byChange = (a: Change, b: Change) => Math.abs(b.now - b.start) - Math.abs(a.now - a.start);

/**
 * Every category in either profile with its subcategories, biggest absolute
 * change first. A category can sit in both the variable and fixed lists (a
 * subcategory tagged fixed under a variable parent), so its parts are added.
 */
function categoryChanges(start: SpendingProfile, now: SpendingProfile): CategoryChange[] {
  const byId = new Map<number, CategoryChange & { subs: Map<number | null, SubcategoryChange> }>();
  const add = (profile: SpendingProfile, side: keyof Change) => {
    const all: ProfileCategory[] = [...profile.variableCategories, ...profile.fixedCategories];
    for (const c of all) {
      const row = byId.get(c.categoryId) ?? {
        categoryId: c.categoryId,
        categoryLabel: c.categoryLabel,
        start: 0,
        now: 0,
        subcategories: [],
        subs: new Map<number | null, SubcategoryChange>(),
      };
      row[side] += c.average;
      for (const sub of c.subcategories ?? []) {
        const part = row.subs.get(sub.subcategoryId) ?? { subcategoryId: sub.subcategoryId, label: sub.label, start: 0, now: 0 };
        part[side] += sub.average;
        row.subs.set(sub.subcategoryId, part);
      }
      byId.set(c.categoryId, row);
    }
  };
  add(start, 'start');
  add(now, 'now');
  return [...byId.values()]
    .map(({ subs, ...row }) => ({ ...row, subcategories: [...subs.values()].sort(byChange) }))
    .sort(byChange);
}

function CompareRow({
  label,
  start,
  now,
  testID,
  indent = false,
}: {
  label: string;
  start: number;
  now: number;
  testID: string;
  /** A subcategory row, set under its category (VS-59). */
  indent?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.row} testID={testID}>
      <Typography style={[styles.label, indent && styles.indent]} numberOfLines={1}>{label}</Typography>
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
            <React.Fragment key={c.categoryId}>
              <CompareRow
                testID={`typical-compare-category-${c.categoryId}`}
                label={displayCategoryName(c.categoryLabel)}
                start={c.start}
                now={c.now}
              />
              {c.subcategories.map((sub) => (
                <CompareRow
                  key={sub.subcategoryId ?? 'none'}
                  indent
                  testID={`typical-compare-sub-${c.categoryId}-${sub.subcategoryId ?? 'none'}`}
                  label={sub.label === null ? t('typical.noSubcategory') : displayCategoryName(sub.label)}
                  start={sub.start}
                  now={sub.now}
                />
              ))}
            </React.Fragment>
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
    indent: { paddingLeft: 14, fontSize: 13 },
    amount: { width: 92, textAlign: 'right', fontSize: 13 },
    now: { fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD, color: c.TEXT_PRIMARY },
    chip: { width: 60, alignItems: 'flex-end' },
    toggle: { color: c.PRIMARY_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD, marginTop: 4 },
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
