import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { MonthStepper } from '@/components/MonthStepper';
import { Skeleton, SkeletonRows } from '@/components/Skeleton';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS, SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { currentMonthISO } from '@/utils/formatDate';
import { monthLabel, nextMonthISO, prevMonthISO } from '@/utils/monthMath';

import { BudgetHeroCard } from './BudgetHeroCard';
import { BudgetInsights } from './BudgetInsights';
import { CategoryEnvelopeRow } from './CategoryEnvelopeRow';
import { EnvelopeEditSheet } from './EnvelopeEditSheet';
import { useBudgetOverview, useEnvelopeActions } from './budget.envelope.hooks';
import type { CategoryBudgetProgress } from './budget.types';

export interface BudgetOverviewProps {
  /** Defaults to the current month (`YYYY-MM`). Override in tests. */
  monthISO?: string;
}

/**
 * The Budget tab.
 *
 * Reads top-down as a month: what is left and whether that is on pace, what
 * still needs assigning, where each category stands, and then the analytics.
 *
 * A month stepper scopes the whole screen, so past months are reviewable and a
 * new month can be planned before it starts.
 */
export function BudgetOverview({ monthISO = currentMonthISO() }: BudgetOverviewProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const [month, setMonth] = useState(monthISO);
  const [editing, setEditing] = useState<CategoryBudgetProgress | null>(null);

  const { overview, loading, error, refresh } = useBudgetOverview(month);
  const { setBudget, remove, coverFrom, error: writeError } = useEnvelopeActions(month);

  // Expenses are logged from other screens entirely, so the tab re-reads every
  // time it regains focus. Without this the figures silently go stale the moment
  // the user logs something and comes back — the pre-VS-33 behaviour.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const openPlanner = () => router.push({ pathname: '/budget/plan', params: { month } });

  /** Envelopes with spare budget, offered as sources when covering an overspend. */
  const coverSources = (overview?.categories ?? []).filter(
    (c) => c.categoryId !== editing?.categoryId && c.remaining > 0 && c.allocated > 0,
  );

  const handleEnvelopeWrite = async (write: Promise<boolean>): Promise<boolean> => {
    const ok = await write;
    if (ok) await refresh();
    return ok;
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <MonthStepper
          label={monthLabel(month)}
          onPrev={() => setMonth(prevMonthISO(month))}
          onNext={() => setMonth(nextMonthISO(month))}
          nextDisabled={month >= currentMonthISO()}
          testIDPrefix="budget-month"
        />

        {loading && !overview ? (
          <BudgetSkeleton />
        ) : !overview ? null : overview.isUnplanned ? (
          <EmptyState
            testID="budget-empty"
            icon="budget"
            title={`No plan for ${monthLabel(month)} yet`}
            subtitle="Set what you can spend this month, then share it out across your categories. You will see exactly where each one stands as the month goes."
            actionLabel="Plan this month"
            onAction={openPlanner}
          />
        ) : (
          <>
            <BudgetHeroCard overview={overview} />

            {overview.plan.unassigned !== 0 ? (
              <Pressable
                testID="budget-unassigned-strip"
                accessibilityRole="button"
                onPress={openPlanner}
                style={[
                  styles.strip,
                  overview.plan.isOverAllocated ? styles.stripDanger : styles.stripInfo,
                ]}
              >
                <View style={styles.stripBody}>
                  <Typography style={styles.stripTitle}>
                    {overview.plan.isOverAllocated
                      ? `${formatCurrency(-overview.plan.unassigned)} over-allocated`
                      : `${formatCurrency(overview.plan.unassigned)} unassigned`}
                  </Typography>
                  <Typography variant="muted">
                    {overview.plan.isOverAllocated
                      ? 'Your categories promise more than your budget.'
                      : 'Give it a job before you spend it.'}
                  </Typography>
                </View>
                <Typography style={styles.stripAction}>Assign</Typography>
              </Pressable>
            ) : null}

            <Card>
              <View style={styles.sectionHeader}>
                <Typography variant="label">Categories</Typography>
                <Pressable
                  accessibilityRole="button"
                  onPress={openPlanner}
                  hitSlop={8}
                  testID="budget-edit-plan"
                >
                  <Typography style={styles.sectionAction}>Edit plan</Typography>
                </Pressable>
              </View>

              {overview.categories.length === 0 ? (
                <Typography variant="muted" testID="budget-no-categories">
                  No category budgets yet. Tap “Edit plan” to share your budget
                  out.
                </Typography>
              ) : (
                overview.categories.map((envelope, index) => (
                  <CategoryEnvelopeRow
                    key={envelope.categoryId}
                    envelope={envelope}
                    first={index === 0}
                    onPress={() => setEditing(envelope)}
                  />
                ))
              )}
            </Card>

            <BudgetInsights overview={overview} />
          </>
        )}

        {error ? (
          <Typography style={styles.error} testID="budget-error">
            {error}
          </Typography>
        ) : null}
      </ScrollView>

      <EnvelopeEditSheet
        envelope={editing}
        coverSources={coverSources}
        error={writeError}
        onClose={() => setEditing(null)}
        onSave={(categoryId, amount, rollover) =>
          handleEnvelopeWrite(setBudget(categoryId, amount, rollover))
        }
        onCoverFrom={(fromId, toId, amount) => handleEnvelopeWrite(coverFrom(fromId, toId, amount))}
        onRemove={(categoryId) => handleEnvelopeWrite(remove(categoryId))}
      />
    </View>
  );
}

/** Placeholder shaped like the loaded screen, so nothing jumps when data lands. */
function BudgetSkeleton() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.skeleton} testID="budget-skeleton">
      <Card>
        <Skeleton width="40%" height={11} />
        <Skeleton width="65%" height={34} style={styles.skeletonGap} />
        <Skeleton height={8} style={styles.skeletonGap} />
      </Card>
      <Card>
        <SkeletonRows count={4} />
      </Card>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  skeleton: {
    gap: SPACING.md,
  },
  skeletonGap: {
    marginTop: SPACING.md,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  stripInfo: {
    backgroundColor: c.PRIMARY_LIGHT,
    borderColor: c.PRIMARY_GREEN,
  },
  stripDanger: {
    backgroundColor: c.DANGER_LIGHT,
    borderColor: c.DANGER,
  },
  stripBody: {
    flex: 1,
  },
  stripTitle: {
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
  },
  stripAction: {
    color: c.PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  sectionAction: {
    color: c.PRIMARY_GREEN,
    fontSize: 13,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  error: {
    color: c.DANGER,
  },
});
