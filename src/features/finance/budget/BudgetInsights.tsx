import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS, SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { daysInMonth } from '@/utils/monthMath';

import { BudgetBurndown } from './BudgetBurndown';
import { getBudgetTrend, type BudgetTrend } from './budget.insights';
import type { BudgetOverview } from './budget.types';

export interface BudgetInsightsProps {
  overview: BudgetOverview;
}

/**
 * The Budget tab's analytics block: the burn-down and weekly pace.
 *
 * Per-category ranking and month-over-month movement used to live here too;
 * they repeated the envelope list above and Reports' comparison, so they went
 * in VS-56. A category's own change now shows in its detail, against a usual
 * month.
 *
 * Collapsed by default. The daily decision ("can I spend this?") is answered
 * entirely by the hero and the envelope rows above; analytics are for the
 * weekly sit-down, and putting them behind one tap keeps the default screen
 * scannable rather than dense.
 *
 * Every section here is suppressed when it has nothing useful to say — an empty
 * chart is worse than no chart.
 */
export function BudgetInsights({ overview }: BudgetInsightsProps) {
  const styles = useThemedStyles(makeStyles);
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation(['budget', 'common']);
  const [trend, setTrend] = useState<BudgetTrend | null>(null);

  useEffect(() => {
    if (!expanded) return;
    let active = true;

    void (async () => {
      const nextTrend = await getBudgetTrend(overview.month, overview.available);
      if (!active) return;
      setTrend(nextTrend);
    })();

    return () => {
      active = false;
    };
  }, [expanded, overview.month, overview.available]);

  return (
    <Card testID="budget-insights">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((prev) => !prev)}
        testID="budget-insights-toggle"
        style={styles.header}
      >
        <Typography variant="label">{t('insights.title')}</Typography>
        <Typography style={styles.toggle}>{expanded ? t('insights.hide') : t('insights.show')}</Typography>
      </Pressable>

      {!expanded ? null : (
        <View style={styles.body} testID="budget-insights-body">
          <Section title={t('insights.burndown')}>
            {trend ? (
              <BudgetBurndown
                points={trend.burndown}
                available={overview.available}
                totalDays={daysInMonth(overview.month)}
                testID="budget-burndown"
              />
            ) : (
              <Typography variant="muted">{t('loading')}</Typography>
            )}
          </Section>

          {trend && trend.weekly.some((w) => w > 0) ? (
            <Section title={t('insights.weekly')}>
              <WeeklyBars weekly={trend.weekly} pace={trend.weeklyPace} />
            </Section>
          ) : null}

        </View>
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <Typography variant="label">{title}</Typography>
      {children}
    </View>
  );
}

/**
 * Weekly spend as bars against the even-pace line. The pace marker is what makes
 * the bars actionable — height alone says nothing about whether a week was
 * affordable.
 */
function WeeklyBars({ weekly, pace }: { weekly: number[]; pace: number }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');
  const c = useTheme();
  const peak = Math.max(pace, ...weekly);

  return (
    <View style={styles.weekly} testID="budget-weekly-bars">
      {weekly.map((amount, index) => (
        <View key={index} style={styles.weekRow} testID={`budget-week-${index + 1}`}>
          <Typography variant="muted" style={styles.weekLabel}>{t('insights.week', { number: index + 1 })}</Typography>
          <ProgressBar
            value={peak > 0 ? (amount / peak) * 100 : 0}
            marker={peak > 0 ? (pace / peak) * 100 : undefined}
            color={amount > pace ? c.WARNING : c.PRIMARY_GREEN}
            style={styles.weekBar}
          />
          <Typography variant="muted" style={styles.weekAmount}>
            {formatCurrency(amount)}
          </Typography>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  toggle: {
    color: c.PRIMARY_TEXT,
    fontSize: 13,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  body: {
    marginTop: SPACING.lg,
    gap: SPACING.xl,
  },
  section: {
    gap: SPACING.md,
  },
  weekly: {
    gap: SPACING.sm,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  weekLabel: {
    width: 26,
  },
  weekBar: {
    flex: 1,
    height: 10,
    borderRadius: RADIUS.full,
  },
  weekAmount: {
    minWidth: 84,
    textAlign: 'right',
    fontSize: 11,
  },
});
