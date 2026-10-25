import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS } from '@/constants/layout';
import { COMPLETE_MONTH_COVERAGE } from '@/features/finance/expenses/expenses.coverage';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { monthLabel } from '@/utils/monthMath';

import { habitSavingsPotential } from './reports.profile';
import { StartingPointBlock, canCompare } from './StartingPointCompare';
import type { SpendKind, SpendingProfile, StartingPoint } from './reports.types';

export interface TypicalMonthCardProps {
  profile: SpendingProfile;
  /** The first three complete months, fixed (VS-58); omitted or null hides that part. */
  startingPoint?: StartingPoint | null;
}

/** How many variable categories the card names — the biggest levers only. */
const TOP_VARIABLE = 3;

/**
 * "Your typical month" on the Reports tab (VS-41): the average of the last
 * complete months, split into fixed commitments, variable spending and
 * surprises, then the variable categories where a new habit would pay off —
 * each with its cheapest and dearest month, from the user's own record.
 * Before any month is complete it says how far each month is from counting.
 * With the starting point (VS-58) it sets now beside the first three complete
 * months, so the user sees how far their habits have moved.
 */
export function TypicalMonthCard({ profile, startingPoint }: TypicalMonthCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { t } = useTranslation('reports');
  const { average } = profile;

  const tagLink = (
    <Pressable accessibilityRole="link" onPress={() => router.push('/expenses/categories')}>
      <Typography style={styles.link}>{t('typical.tagHint')}</Typography>
    </Pressable>
  );

  if (average === null) {
    return (
      <Card testID="typical-month-card" style={styles.card}>
        <Typography variant="subheading">{t('typical.title')}</Typography>
        <Typography>{t('typical.notEnough')}</Typography>
        <Typography variant="muted">
          {t('typical.notEnoughHint', { percent: Math.round(COMPLETE_MONTH_COVERAGE * 100) })}
        </Typography>
        {profile.months.map((m) => (
          <Typography key={m.month} variant="muted">
            {t('typical.coverage', { month: monthLabel(m.month), percent: Math.round(m.coverage * 100) })}
          </Typography>
        ))}
        {startingPoint ? <StartingPointBlock startingPoint={startingPoint} now={profile} /> : null}
        {tagLink}
      </Card>
    );
  }

  const complete = profile.months.filter((m) => m.isComplete);
  const kinds: { kind: SpendKind; color: string }[] = [
    // Kind colours (UX-15): fixed is routine, variable is everyday.
    { kind: 'fixed', color: c.KIND_ROUTINE },
    { kind: 'variable', color: c.KIND_EVERYDAY },
    { kind: 'unexpected', color: c.KIND_UNEXPECTED },
  ];
  const potential = habitSavingsPotential(profile);

  return (
    <Card testID="typical-month-card" style={styles.card}>
      <Typography variant="subheading">{t('typical.title')}</Typography>
      <Typography testID="typical-total" style={styles.total}>
        {t('typical.perMonth', { amount: formatCurrency(average.total) })}
      </Typography>
      {/* Three complete months make an average worth acting on (VS-46). */}
      <Pill
        testID="typical-confidence"
        label={t(complete.length < 3 ? 'typical.provisional' : 'typical.reliable')}
        tone={complete.length < 3 ? 'warning' : 'success'}
        style={styles.pill}
      />
      <Typography variant="muted">
        {t('typical.basedOn', {
          count: complete.length,
          months: complete.map((m) => monthLabel(m.month)).join(', '),
        })}
      </Typography>

      <View style={styles.bar}>
        {kinds.map(({ kind, color }) =>
          average[kind] > 0 ? (
            <View key={kind} style={{ flex: average[kind], backgroundColor: color }} />
          ) : null,
        )}
      </View>
      {/* With a starting point to compare, the table carries these figures (VS-58). */}
      {canCompare(startingPoint, profile) ? null : kinds.map(({ kind, color }) => (
        <View key={kind} style={styles.row} testID={`typical-${kind}`}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Typography style={styles.grow}>{t(`typical.${kind}`)}</Typography>
          <Typography>{formatCurrency(average[kind])}</Typography>
        </View>
      ))}

      {startingPoint ? <StartingPointBlock startingPoint={startingPoint} now={profile} /> : null}

      {profile.variableCategories.length > 0 ? (
        <>
          <Typography variant="label" style={styles.sectionTitle}>
            {t('typical.actTitle')}
          </Typography>
          {profile.variableCategories.slice(0, TOP_VARIABLE).map((cat) => (
            <View key={cat.categoryId} style={styles.row} testID={`typical-category-${cat.categoryId}`}>
              <View style={styles.grow}>
                <Typography>{displayCategoryName(cat.categoryLabel)}</Typography>
                <Typography variant="muted">
                  {t('typical.range', {
                    low: formatCurrency(cat.lowest),
                    high: formatCurrency(cat.highest),
                  })}
                </Typography>
              </View>
              <Typography>{formatCurrency(cat.average)}</Typography>
            </View>
          ))}
        </>
      ) : null}

      {potential > 0 ? (
        <Typography testID="typical-potential" style={styles.potential}>
          {t('typical.potential', { amount: formatCurrency(potential) })}
        </Typography>
      ) : null}

      {profile.fixedCategories.length > 0 ? (
        <Typography variant="muted">
          {t('typical.fixedList', {
            names: profile.fixedCategories.map((f) => displayCategoryName(f.categoryLabel)).join(', '),
          })}
        </Typography>
      ) : null}

      {tagLink}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: 8 },
    pill: { alignSelf: 'flex-start' },
    total: { fontSize: 22, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD, color: c.TEXT_PRIMARY },
    bar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: RADIUS.full,
      overflow: 'hidden',
      backgroundColor: c.SURFACE_MUTED,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: RADIUS.full },
    grow: { flex: 1 },
    sectionTitle: { marginTop: 6 },
    potential: { color: c.SUCCESS_TEXT },
    link: { color: c.PRIMARY_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
  });
