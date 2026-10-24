import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ICON_SIZE } from '@/constants/icons';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

import { useBaselineChecklist } from './budget.baseline.hooks';
import type { BaselineKind, BaselineStep } from './budget.types';

/** Where each step is completed. Routes are path strings, so no feature is imported. */
const STEP_ROUTE: Record<BaselineStep['key'], string> = {
  balances: '/accounts',
  bills: '/expenses/recurring',
  debts: '/debt',
  costTypes: '/expenses/categories',
  estimates: '/budget/estimates',
};

/** Steps that can also be answered in place, and the answer they record. */
const STEP_ANSWER: Partial<Record<BaselineStep['key'], BaselineKind>> = {
  debts: 'no_debts',
  costTypes: 'cost_types_reviewed',
};

export interface BaselineCardProps {
  /**
   * The steps to show, in checklist order; all of them when omitted. My path
   * passes only what its current step needs (UX-09), so a new user is not
   * asked about bills and estimates while still observing.
   */
  only?: ReadonlyArray<BaselineStep['key']>;
}

/**
 * "Set up your baseline" (VS-46): a short, skippable checklist. Each step
 * opens the screen that already does the job — confirm balances, add
 * recurring bills, record debts, review fixed categories, enter estimates. It
 * disappears once every step it shows is done, or when hidden.
 */
export function BaselineCard({ only }: BaselineCardProps = {}) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { t } = useTranslation('budget');
  const { steps: allSteps, hidden, loading, refresh, answer } = useBaselineChecklist();
  const steps = only ? allSteps.filter((s) => only.includes(s.key)) : allSteps;

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const doneCount = steps.filter((s) => s.done).length;
  if (loading || hidden || steps.length === 0 || doneCount === steps.length) return null;

  return (
    <Card style={styles.card} testID="baseline-card">
      <View style={styles.header}>
        <Typography variant="subheading" style={styles.grow}>
          {t('baseline.title')}
        </Typography>
        <Pressable testID="baseline-hide" accessibilityRole="button" onPress={() => void answer('checklist_hidden')}>
          <Typography variant="muted">{t('baseline.hide')}</Typography>
        </Pressable>
      </View>
      <Typography variant="muted">{t('baseline.progress', { done: doneCount, total: steps.length })}</Typography>

      {steps.map((step) => {
        const quickAnswer = STEP_ANSWER[step.key];
        return (
          <View key={step.key} testID={`baseline-step-${step.key}`} style={styles.step}>
            <Icon
              name={step.done ? 'check' : 'circle'}
              size={ICON_SIZE.sm}
              color={step.done ? c.SUCCESS : c.TEXT_MUTED}
            />
            <Typography style={[styles.grow, step.done && styles.done]}>{t(`baseline.steps.${step.key}`)}</Typography>
            {step.done ? null : (
              <View style={styles.actions}>
                {quickAnswer ? (
                  <Button
                    testID={`baseline-none-${step.key}`}
                    label={t(`baseline.quick.${step.key as 'debts' | 'costTypes'}`)}
                    variant="ghost"
                    compact
                    onPress={() => void answer(quickAnswer)}
                  />
                ) : null}
                <Button
                  testID={`baseline-open-${step.key}`}
                  label={t('baseline.open')}
                  variant="secondary"
                  compact
                  onPress={() => router.push(STEP_ROUTE[step.key] as never)}
                />
              </View>
            )}
          </View>
        );
      })}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: 8 },
    header: { flexDirection: 'row', alignItems: 'center' },
    grow: { flex: 1 },
    step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actions: { flexDirection: 'row', gap: 4 },
    done: { color: c.TEXT_MUTED },
  });
