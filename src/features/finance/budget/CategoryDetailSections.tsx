import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill, type PillTone } from '@/components/Pill';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

import { percentChange } from './budget.nextMonth';
import type { CategoryDetail, NextMonthPlan, NextMonthStep } from './budget.types';

/**
 * The cards of the category drill-down (VS-56). Each answers one question —
 * how this month compares, where the money went, what to do next month — and
 * renders nothing when it has nothing to say, so a sparse month stays short.
 */

/** Within ±this many percent, a change reads as neutral rather than good or bad. */
const NEUTRAL_BAND = 10;

/** "+50%" / "−25%" / "New", tinted: red when up, green when down. */
export function ChangeChip({ change, testID }: { change: number | null; testID: string }) {
  const { t } = useTranslation('budget');
  if (change === null) return <Pill testID={testID} label={t('detail.newThisMonth')} tone="warning" />;
  const tone: PillTone = change > NEUTRAL_BAND ? 'danger' : change < -NEUTRAL_BAND ? 'success' : 'neutral';
  const label = change > 0 ? `+${change}%` : change < 0 ? `−${Math.abs(change)}%` : '0%';
  return <Pill testID={testID} label={label} tone={tone} />;
}

/** The month against a usual one, under the envelope row. */
export function UsualComparison({ detail, heading, running }: { detail: CategoryDetail; heading: number; running: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');

  if (detail.average === null) {
    return (
      <Typography variant="muted" testID="detail-no-usual">
        {t('detail.noUsual')}
      </Typography>
    );
  }

  return (
    <View style={styles.comparison}>
      <ChangeChip testID="detail-change" change={percentChange(heading, detail.average)} />
      <Typography variant="muted" style={styles.grow} testID="detail-vs-usual">
        {t(running ? 'detail.vsUsualPace' : 'detail.vsUsual', { amount: formatCurrency(detail.average) })}
      </Typography>
    </View>
  );
}

/**
 * Where it went: each subcategory's amount, share and change against its own
 * usual month, then the purchases that keep coming back.
 *
 * @param scale `heading / spent`, so a running month's parts compare on pace.
 */
export function WhereItWentCard({ detail, scale }: { detail: CategoryDetail; scale: number }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');
  if (detail.parts.length === 0 && detail.repeats.length === 0) return null;

  return (
    <Card testID="detail-where" style={styles.card}>
      <Typography variant="label">{t('detail.whereTitle')}</Typography>
      {detail.parts.map((part) => {
        const key = part.subcategoryId ?? 'none';
        return (
          <View key={key} style={styles.part}>
            <View style={styles.line} testID={`detail-part-${key}`}>
              <View style={styles.grow}>
                <Typography numberOfLines={1}>
                  {part.name === null ? t('detail.noSubcategory') : displayCategoryName(part.name)}
                </Typography>
                <Typography variant="muted" style={styles.meta}>
                  {t('detail.partShare', { percent: Math.round(part.sharePct), count: part.count })}
                </Typography>
              </View>
              {part.usual === null ? null : (
                <ChangeChip
                  testID={`detail-part-change-${key}`}
                  change={percentChange(part.amount * scale, part.usual)}
                />
              )}
              <Typography style={styles.amount}>{formatCurrency(part.amount)}</Typography>
            </View>
            <ProgressBar value={Math.min(100, part.sharePct)} style={styles.bar} />
          </View>
        );
      })}

      {detail.repeats.length > 0 ? (
        <>
          <Typography variant="label" style={detail.parts.length > 0 ? styles.subheading : undefined}>
            {t('detail.repeatsTitle')}
          </Typography>
          {detail.repeats.map((repeat, index) => (
            <View key={repeat.label} style={styles.line} testID={`detail-repeat-${index}`}>
              <Typography style={styles.grow} numberOfLines={1}>
                {t('detail.repeat', { label: repeat.label, count: repeat.count })}
              </Typography>
              <Typography style={styles.amount}>{formatCurrency(repeat.total)}</Typography>
            </View>
          ))}
        </>
      ) : null}
    </Card>
  );
}

/** One "how to get there" line, with the saving it brings. */
function StepLine({ step, testID }: { step: NextMonthStep; testID: string }) {
  const { t } = useTranslation('budget');
  const amount = formatCurrency(step.saving);
  const text =
    step.kind === 'fewerRepeats'
      ? t('detail.stepFewerRepeats', { label: step.label, count: step.count, amount })
      : step.name === null
        ? t('detail.stepBackToUsualOther', { amount })
        : t('detail.stepBackToUsual', { name: displayCategoryName(step.name), amount });
  return <Typography testID={testID}>{`• ${text}`}</Typography>;
}

export interface NextMonthCardProps {
  plan: NextMonthPlan;
  /** What next month already has budgeted for the category, or null. */
  nextMonthBudget: number | null;
  onUseTarget: (amount: number) => void;
}

/** Next month: a suggested budget, why, the steps to reach it, and one tap to set it. */
export function NextMonthCard({ plan, nextMonthBudget, onUseTarget }: NextMonthCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');
  const target = formatCurrency(plan.target);
  const percent = Math.abs(plan.changePct ?? 0);

  const headline =
    plan.method === 'fixed'
      ? t('detail.nextFixed')
      : percent === 0
        ? t('detail.nextKeep', { target })
        : t(plan.method === 'usual' ? 'detail.nextUsual' : 'detail.nextTrim', { target, percent });

  return (
    <Card testID="detail-next" style={styles.card}>
      <Typography variant="label">{t('detail.nextTitle')}</Typography>
      <Typography testID="detail-next-target">{headline}</Typography>
      {plan.method !== 'fixed' && plan.fixed > 0 ? (
        <Typography variant="muted" testID="detail-next-fixed">
          {t('detail.nextFixedNote', { amount: formatCurrency(plan.fixed) })}
        </Typography>
      ) : null}

      {plan.steps.length > 0 ? (
        <>
          <Typography variant="label" style={styles.subheading}>
            {t('detail.stepsTitle')}
          </Typography>
          {plan.steps.map((step, index) => (
            <StepLine key={`${step.kind}-${index}`} step={step} testID={`detail-step-${index}`} />
          ))}
        </>
      ) : null}

      {nextMonthBudget === plan.target ? (
        <Typography variant="muted" testID="detail-next-set">
          {`✓ ${t('detail.nextSet', { amount: target })}`}
        </Typography>
      ) : (
        <>
          {nextMonthBudget !== null ? (
            <Typography variant="muted" testID="detail-next-current">
              {t('detail.nextSet', { amount: formatCurrency(nextMonthBudget) })}
            </Typography>
          ) : null}
          <Button
            testID="detail-use-target"
            label={t('detail.useTarget', { amount: target })}
            variant="secondary"
            compact
            onPress={() => onUseTarget(plan.target)}
          />
        </>
      )}
    </Card>
  );
}

const makeStyles = (_c: ThemeColors) => StyleSheet.create({
  card: {
    gap: SPACING.sm,
  },
  comparison: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  grow: {
    flex: 1,
  },
  meta: {
    fontSize: 11,
  },
  amount: {
    fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD,
  },
  part: {
    gap: SPACING.xs,
  },
  bar: {
    height: 4,
  },
  subheading: {
    marginTop: SPACING.sm,
  },
});
