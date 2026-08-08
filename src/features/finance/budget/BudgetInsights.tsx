import React, { useEffect, useState } from 'react';
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
import {
  getBudgetTrend,
  getMonthOverMonth,
  rankByBudgetShare,
  type BudgetTrend,
  type CategoryTrend,
} from './budget.insights';
import type { BudgetOverview } from './budget.types';

export interface BudgetInsightsProps {
  overview: BudgetOverview;
}

/**
 * The Budget tab's analytics block: burn-down, weekly pace, biggest consumers,
 * and month-over-month movement.
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
  const [trend, setTrend] = useState<BudgetTrend | null>(null);
  const [comparison, setComparison] = useState<CategoryTrend[]>([]);

  useEffect(() => {
    if (!expanded) return;
    let active = true;

    void (async () => {
      const [nextTrend, nextComparison] = await Promise.all([
        getBudgetTrend(overview.month, overview.available),
        getMonthOverMonth(overview.month),
      ]);
      if (!active) return;
      setTrend(nextTrend);
      setComparison(nextComparison);
    })();

    return () => {
      active = false;
    };
  }, [expanded, overview.month, overview.available]);

  const topConsumers = rankByBudgetShare(overview.categories, overview.available);

  return (
    <Card testID="budget-insights">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((prev) => !prev)}
        testID="budget-insights-toggle"
        style={styles.header}
      >
        <Typography variant="label">Insights</Typography>
        <Typography style={styles.toggle}>{expanded ? 'Hide' : 'Show'}</Typography>
      </Pressable>

      {!expanded ? null : (
        <View style={styles.body} testID="budget-insights-body">
          <Section title="Remaining budget over the month">
            {trend ? (
              <BudgetBurndown
                points={trend.burndown}
                available={overview.available}
                totalDays={daysInMonth(overview.month)}
                testID="budget-burndown"
              />
            ) : (
              <Typography variant="muted">Loading…</Typography>
            )}
          </Section>

          {trend && trend.weekly.some((w) => w > 0) ? (
            <Section title="Weekly spending">
              <WeeklyBars weekly={trend.weekly} pace={trend.weeklyPace} />
            </Section>
          ) : null}

          {topConsumers.length > 0 ? (
            <Section title="Biggest share of your budget">
              {topConsumers.map((entry) => (
                <View
                  key={entry.categoryId}
                  style={styles.shareRow}
                  testID={`budget-share-${entry.categoryId}`}
                >
                  <Typography style={styles.shareName}>{entry.categoryName}</Typography>
                  <Typography variant="muted">
                    {`${Math.round(entry.shareOfBudgetPct)}% · ${formatCurrency(entry.spent)}`}
                  </Typography>
                </View>
              ))}
            </Section>
          ) : null}

          {comparison.length > 0 ? (
            <Section title="Versus last month">
              {comparison.slice(0, 5).map((entry) => (
                <ComparisonRow key={entry.categoryId} entry={entry} />
              ))}
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
  const c = useTheme();
  const peak = Math.max(pace, ...weekly);

  return (
    <View style={styles.weekly} testID="budget-weekly-bars">
      {weekly.map((amount, index) => (
        <View key={index} style={styles.weekRow} testID={`budget-week-${index + 1}`}>
          <Typography variant="muted" style={styles.weekLabel}>{`W${index + 1}`}</Typography>
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

function ComparisonRow({ entry }: { entry: CategoryTrend }) {
  const styles = useThemedStyles(makeStyles);
  const delta = entry.current - entry.previous;
  const up = delta > 0;

  return (
    <View style={styles.shareRow} testID={`budget-vs-${entry.categoryId}`}>
      <Typography style={styles.shareName}>{entry.categoryName}</Typography>
      <Typography variant="muted" style={up ? styles.deltaUp : styles.deltaDown}>
        {`${up ? '+' : ''}${formatCurrency(delta)}`}
        {entry.changePct !== null ? ` (${up ? '+' : ''}${Math.round(entry.changePct)}%)` : ''}
      </Typography>
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
    color: c.PRIMARY_GREEN,
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
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  shareName: {
    flex: 1,
  },
  deltaUp: {
    color: c.DANGER_TEXT,
  },
  deltaDown: {
    color: c.SUCCESS_TEXT,
  },
});
