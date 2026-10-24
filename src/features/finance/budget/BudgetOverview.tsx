import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useIsBeforeStep, useJourneyStage } from '@/components/JourneyStageProvider';
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
import { MoneyViewCard } from './MoneyViewCard';
import { SurplusCard } from './SurplusCard';
import { useCashflow } from './budget.cashflow.hooks';
import { useBudgetOverview } from './budget.envelope.hooks';

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
 *
 * Before the Plan step, a month without a plan explains why planning comes
 * later, with "Plan anyway" (UX-10). The step sets emphasis, never access: a
 * plan that exists always shows.
 */
export function BudgetOverview({ monthISO = currentMonthISO() }: BudgetOverviewProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['budget', 'common']);
  const [month, setMonth] = useState(monthISO);
  const stage = useJourneyStage();
  const beforePlan = useIsBeforeStep('plan');

  const { overview, loading, error, refresh } = useBudgetOverview(month);
  // Cash and the surplus prompt are about now, so only the current month has them (VS-47).
  const isCurrent = month === currentMonthISO();
  const cashflow = useCashflow(month, isCurrent);
  const refreshCashflow = cashflow.refresh;

  // Expenses are logged from other screens entirely, so the tab re-reads every
  // time it regains focus. Without this the figures silently go stale the moment
  // the user logs something and comes back — the pre-VS-33 behaviour.
  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshCashflow();
    }, [refresh, refreshCashflow]),
  );

  const answerSurplus = async (write: Promise<void>) => {
    await write;
    await refresh();
  };

  const openPlanner = () => router.push({ pathname: '/budget/plan', params: { month } });

  // The envelope's drill-down, where it is also edited (VS-56).
  const openCategory = (categoryId: number) =>
    router.push({ pathname: '/budget/category/[id]', params: { id: String(categoryId), month } });

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

        {/* The shared error (UX-16): a card above figures still on screen, the
            full block in their place when there are none. */}
        {error ? (
          <ErrorState
            compact={overview !== null}
            testID="budget-error"
            title={t('errors.loadTitle')}
            message={error}
            onRetry={() => void refresh()}
          />
        ) : null}

        {loading && !overview ? (
          <BudgetSkeleton />
        ) : !overview ? null : overview.isUnplanned && beforePlan ? (
          <EmptyState
            testID="budget-preview"
            icon="path"
            title={t('preview.title')}
            subtitle={t(stage === 'see' ? 'preview.see' : 'preview.observe')}
            actionLabel={t('preview.action')}
            onAction={openPlanner}
            secondaryActionLabel={t('preview.path')}
            onSecondaryAction={() => router.push('/path')}
          />
        ) : overview.isUnplanned ? (
          <EmptyState
            testID="budget-empty"
            icon="budget"
            title={t('overview.emptyTitle', { month: monthLabel(month) })}
            subtitle={t('overview.emptySubtitle')}
            actionLabel={t('overview.emptyAction')}
            onAction={openPlanner}
          />
        ) : (
          <>
            <BudgetHeroCard overview={overview} />

            {isCurrent && overview.plan.surplusNeedsJob ? (
              <SurplusCard
                amount={overview.plan.unbudgetedIncome}
                onAddToBudget={() => void answerSurplus(cashflow.addToBudget(overview.plan))}
                onLeave={() => void answerSurplus(cashflow.leaveUnbudgeted(overview.plan))}
              />
            ) : null}

            {cashflow.money ? <MoneyViewCard money={cashflow.money} /> : null}

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
                      ? t('overview.overAllocated', { amount: formatCurrency(-overview.plan.unassigned) })
                      : t('overview.unassigned', { amount: formatCurrency(overview.plan.unassigned) })}
                  </Typography>
                  <Typography variant="muted">
                    {overview.plan.isOverAllocated
                      ? t('overview.overAllocatedHint')
                      : t('overview.unassignedHint')}
                  </Typography>
                </View>
                <Typography style={styles.stripAction}>{t('overview.assign')}</Typography>
              </Pressable>
            ) : null}

            <Card>
              <View style={styles.sectionHeader}>
                <Typography variant="label">{t('overview.categories')}</Typography>
                <Pressable
                  accessibilityRole="button"
                  onPress={openPlanner}
                  hitSlop={8}
                  testID="budget-edit-plan"
                >
                  <Typography style={styles.sectionAction}>{t('overview.editPlan')}</Typography>
                </Pressable>
              </View>

              {overview.categories.length === 0 ? (
                <Typography variant="muted" testID="budget-no-categories">
                  {t('overview.noCategories')}
                </Typography>
              ) : (
                overview.categories.map((envelope, index) => (
                  <CategoryEnvelopeRow
                    key={envelope.categoryId}
                    envelope={envelope}
                    first={index === 0}
                    onPress={() => openCategory(envelope.categoryId)}
                  />
                ))
              )}
            </Card>

            <BudgetInsights overview={overview} />
          </>
        )}

      </ScrollView>
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
    color: c.PRIMARY_TEXT,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  sectionAction: {
    color: c.PRIMARY_TEXT,
    fontSize: 13,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
