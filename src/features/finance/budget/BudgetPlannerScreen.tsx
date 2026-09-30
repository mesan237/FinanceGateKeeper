import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AmountInput } from '@/components/AmountInput';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { Pill } from '@/components/Pill';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { RADIUS, SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { currentMonthISO } from '@/utils/formatDate';
import { monthLabel } from '@/utils/monthMath';

import { PlannerCategoryRow } from './PlannerCategoryRow';
import { useBudgetPlanner } from './budget.planner.hooks';

export interface BudgetPlannerScreenProps {
  /** Defaults to the current month (`YYYY-MM`). Override in tests and routing. */
  monthISO?: string;
}

/**
 * The month planner: set a total, then hand it out across categories.
 *
 * The screen is built around one number — **Unassigned** — pinned to a footer so
 * it stays visible while the user types. That turns distribution into a task
 * with a finish line ("get to zero") rather than an open-ended form, which is
 * the pattern that most reliably makes budgeting feel like a decision instead of
 * data entry.
 *
 * Nothing is written until Save, so exploring an allocation costs nothing.
 * Envelopes are never month-locked: adjusting mid-month is expected, not an
 * exception the UI has to fight.
 */
export function BudgetPlannerScreen({ monthISO = currentMonthISO() }: BudgetPlannerScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const planner = useBudgetPlanner(monthISO);
  const { t } = useTranslation(['budget', 'common']);

  if (planner.loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title={t('planner.title', { month: monthLabel(monthISO) })}
          cancelLabel={t('common:actions.cancel')}
        />
        <LoadingState label={t('planner.loading')} testID="planner-loading" />
      </View>
    );
  }

  const handleSave = async () => {
    if (await planner.save()) router.back();
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('planner.title', { month: monthLabel(monthISO) })}
        cancelLabel={t('common:actions.cancel')}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Typography variant="label">{t('planner.monthlyBudget')}</Typography>
          <View style={styles.totalField}>
            <AmountInput
              value={planner.totalInput}
              onChangeText={planner.setTotalInput}
              accessibilityLabel={t('planner.monthlyBudgetA11y')}
              testID="planner-total"
            />
          </View>
          <Typography variant="muted" testID="planner-total-hint">
            {planner.totalInput
              ? t('planner.setByYou')
              : t('planner.followingIncome', { amount: formatCurrency(planner.derivedTotal) })}
          </Typography>

          <View style={styles.chips}>
            {planner.totalInput ? (
              <SuggestionChip
                label={t('planner.useIncome')}
                testID="planner-use-derived"
                onPress={planner.useDerivedTotal}
              />
            ) : null}
            <SuggestionChip
              label={t('planner.copyLastMonth')}
              testID="planner-copy-last-month"
              onPress={() => void planner.copyFromLastMonth()}
            />
            {planner.suggestions.size > 0 ? (
              <SuggestionChip
                label={t('planner.useAverages')}
                testID="planner-apply-suggestions"
                onPress={planner.applySuggestions}
              />
            ) : null}
          </View>
        </Card>

        <Card>
          <Typography variant="label">{t('planner.categories')}</Typography>
          <Typography variant="muted" style={styles.sectionHint}>
            {t('planner.categoriesHint')}
          </Typography>

          {planner.categories.map((category, index) => (
            <PlannerCategoryRow
              key={category.id}
              name={category.name}
              value={planner.amounts[category.id] ?? ''}
              suggestion={planner.suggestions.get(category.id)}
              rollover={planner.rollovers[category.id] ?? false}
              first={index === 0}
              onChange={(text) => planner.setAmount(category.id, text)}
              onToggleRollover={() => planner.toggleRollover(category.id)}
              onTakeRemainder={() => planner.distributeRemainder(category.id)}
              testID={`planner-category-${category.id}`}
            />
          ))}
        </Card>

        {planner.error ? (
          <Typography style={styles.error} testID="planner-error">
            {planner.error}
          </Typography>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <View style={styles.footerText}>
            <Typography variant="label">
              {planner.isOverAllocated ? t('planner.overAllocated') : t('planner.unassigned')}
            </Typography>
            <Typography
              testID="planner-unassigned"
              style={[
                styles.unassigned,
                planner.isOverAllocated && styles.unassignedOver,
                planner.unassigned === 0 && styles.unassignedDone,
              ]}
            >
              {formatCurrency(Math.abs(planner.unassigned))}
            </Typography>
          </View>
          <Pill
            label={t('planner.assignedOf', {
              assigned: formatCurrency(planner.assigned),
              total: formatCurrency(planner.totalBudget),
            })}
            tone={planner.isOverAllocated ? 'danger' : 'neutral'}
          />
        </View>

        {planner.isOverAllocated ? (
          <Typography variant="muted" style={styles.warning} testID="planner-over-warning">
            {t('planner.overWarning')}
          </Typography>
        ) : null}

        <Button
          label={t('planner.save')}
          onPress={() => void handleSave()}
          loading={planner.saving}
          testID="planner-save"
        />
      </View>
    </View>
  );
}

interface SuggestionChipProps {
  label: string;
  onPress: () => void;
  testID: string;
}

/** A one-tap shortcut that fills the plan from something the user already has. */
function SuggestionChip({ label, onPress, testID }: SuggestionChipProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} testID={testID} style={styles.chip}>
      <Typography style={styles.chipText}>{label}</Typography>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  totalField: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionHint: {
    marginTop: -SPACING.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: c.PRIMARY_LIGHT,
  },
  chipText: {
    color: c.PRIMARY_GREEN,
    fontSize: 13,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
  footer: {
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: c.BORDER,
    backgroundColor: c.SURFACE,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  footerText: {
    flex: 1,
  },
  unassigned: {
    color: c.TEXT_PRIMARY,
    fontSize: 26,
    fontFamily: FONT_FAMILY.SPACE_GROTESK_BOLD,
    letterSpacing: -0.5,
  },
  unassignedOver: {
    color: c.DANGER,
  },
  unassignedDone: {
    color: c.PRIMARY_GREEN,
  },
  warning: {
    color: c.DANGER_TEXT,
  },
  error: {
    color: c.DANGER,
  },
});
