import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Pill } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE } from '@/constants/icons';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { BudgetBreakdownSheet, type BreakdownLine } from './BudgetBreakdownSheet';
import { healthDisplay } from './budgetHealthDisplay';
import type { BudgetOverview } from './budget.types';

export interface BudgetHeroCardProps {
  overview: BudgetOverview;
}

/**
 * The Budget tab's headline: what is left, how that compares to the pace the
 * month can absorb, and where the month is heading.
 *
 * Deliberate choices:
 *
 *  - The bar carries a **pace marker** at the even-spend position, so it answers
 *    "am I ahead or behind?" rather than only "how much is gone?". A bar at 60%
 *    means nothing without knowing whether today is the 10th or the 25th.
 *  - The status is a **word** in a tinted chip, not just a bar colour — colour
 *    alone is unreadable for a colour-blind user (UX audit L5).
 *  - Few figures (UX-13): what is left, what is spent of what, and a day to stay
 *    on plan. "Heading for" appears only when the month is heading past the
 *    plan, the sentence that changes behaviour. How the total is made (expected
 *    income, goals set aside, carried over) is one tap away, as a sum.
 */
export function BudgetHeroCard({ overview }: BudgetHeroCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation(['budget', 'common']);
  const status = healthDisplay(overview.health, c);
  const isOver = overview.remaining < 0;
  const [buildOpen, setBuildOpen] = useState(false);
  const { plan } = overview;
  const expected = plan.derivedSource === 'expected' && !plan.isExplicit;
  const headingOver = overview.projected > overview.available;
  const expectedLine = t('hero.expectedIncome', {
    received: formatCurrency(plan.receivedIncome),
    expected: formatCurrency(plan.expectedIncome ?? 0),
  });
  const source = plan.isExplicit ? 'explicit' : plan.derivedSource;

  const buildLines: BreakdownLine[] = [
    {
      label: t('build.total'),
      hint: t(`build.source.${source}`),
      amount: plan.totalBudget,
      testID: 'plan-build-total',
      hintTestID: 'plan-build-total-source',
    },
  ];
  if (plan.setAside > 0) {
    buildLines.push({ label: t('build.setAside'), amount: plan.setAside, sign: 'minus', testID: 'plan-build-set-aside' });
  }
  if (overview.totalCarried !== 0) {
    buildLines.push({
      label: t('build.carried'),
      amount: Math.abs(overview.totalCarried),
      sign: overview.totalCarried > 0 ? 'plus' : 'minus',
      testID: 'plan-build-carried',
    });
  }

  return (
    <Card testID="budget-hero">
      <View style={styles.headerRow}>
        <Typography variant="label">
          {isOver ? t('hero.overBy') : t('hero.leftInPlan')}
        </Typography>
        <Pill label={status.label} tone={status.tone} testID="budget-health-chip" />
      </View>

      <AnimatedCounter
        value={Math.abs(overview.remaining)}
        style={[styles.amount, isOver && styles.amountOver]}
        testID="budget-remaining"
      />

      <ProgressBar
        testID="budget-meter"
        value={Math.min(100, overview.consumedPct)}
        marker={overview.available > 0 ? (overview.expectedToDate / overview.available) * 100 : undefined}
        color={status.color}
        animated
        style={styles.meter}
      />

      <Typography variant="muted">
        {t('hero.spentOf', {
          spent: formatCurrency(overview.spent),
          available: formatCurrency(overview.available),
        })}
      </Typography>
      {/* The same words and rounding as Home's Today card (UX-11). */}
      <Typography variant="muted" style={styles.line} testID="budget-per-day">
        {t('hero.perDayLine', { amount: formatCurrency(Math.round(overview.safeDailySpend)) })}
      </Typography>

      {headingOver ? (
        <Typography style={[styles.line, styles.alert]} testID="budget-heading-for">
          {t('hero.headingForLine', { amount: formatCurrency(Math.round(overview.projected)) })}
        </Typography>
      ) : null}

      {/* Kept in the hero only while it explains a plan bigger than the cash in. */}
      {expected && overview.plan.receivedIncome < (overview.plan.expectedIncome ?? 0) ? (
        <Typography variant="muted" style={styles.line} testID="budget-expected-income">
          {expectedLine}
        </Typography>
      ) : null}

      <Pressable
        testID="budget-how-built"
        accessibilityRole="button"
        onPress={() => setBuildOpen(true)}
        hitSlop={8}
        style={styles.link}
      >
        <Typography style={styles.linkText}>{t('hero.howBuilt')}</Typography>
        <Icon name="forward" size={ICON_SIZE.sm} color={c.PRIMARY_TEXT} />
      </Pressable>

      <BudgetBreakdownSheet
        visible={buildOpen}
        onClose={() => setBuildOpen(false)}
        testID="plan-build-sheet"
        title={t('build.title')}
        lines={buildLines}
        total={{ label: t('build.result'), amount: overview.available, testID: 'plan-build-result' }}
        note={expected ? expectedLine : null}
      />
    </Card>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  amount: {
    color: c.TEXT_PRIMARY,
    fontSize: 34,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_BOLD,
    letterSpacing: -0.5,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  amountOver: {
    color: c.DANGER,
  },
  meter: {
    marginBottom: SPACING.sm,
  },
  line: {
    marginTop: SPACING.xs,
  },
  alert: {
    color: c.DANGER_TEXT,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  linkText: {
    color: c.PRIMARY_TEXT,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
