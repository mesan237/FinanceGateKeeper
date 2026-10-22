import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort } from '@/utils/formatDate';

import type { CategoryDetail } from './budget.types';

/**
 * The cards of the category drill-down (VS-56), each answering one question
 * about where the money went. Each renders nothing when it has nothing to say,
 * so a sparse month stays short.
 */

interface SectionProps {
  detail: CategoryDetail;
}

/** One label · amount line, the shape every card here shares. */
function Line({ label, amount, meta, testID }: { label: string; amount: number; meta?: string; testID: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.line} testID={testID}>
      <View style={styles.grow}>
        <Typography numberOfLines={1}>{label}</Typography>
        {meta ? <Typography variant="muted" style={styles.meta}>{meta}</Typography> : null}
      </View>
      <Typography style={styles.amount}>{formatCurrency(amount)}</Typography>
    </View>
  );
}

/** The split by subcategory, with a share bar under each line. */
export function WhereItWentCard({ detail }: SectionProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');
  if (detail.parts.length === 0) return null;

  return (
    <Card testID="detail-parts" style={styles.card}>
      <Typography variant="label">{t('detail.whereTitle')}</Typography>
      {detail.parts.map((part) => (
        <View key={part.subcategoryId ?? 'none'} style={styles.part}>
          <Line
            testID={`detail-part-${part.subcategoryId ?? 'none'}`}
            label={part.name === null ? t('detail.noSubcategory') : displayCategoryName(part.name)}
            meta={t('detail.partMeta', { percent: Math.round(part.sharePct), count: part.count })}
            amount={part.amount}
          />
          <ProgressBar value={Math.min(100, part.sharePct)} style={styles.bar} />
        </View>
      ))}
    </Card>
  );
}

/** Purchases that share a note: the small habits that add up. */
export function RepeatsCard({ detail }: SectionProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');
  if (detail.repeats.length === 0) return null;

  return (
    <Card testID="detail-repeats" style={styles.card}>
      <Typography variant="label">{t('detail.repeatsTitle')}</Typography>
      <Typography variant="muted">{t('detail.repeatsHint')}</Typography>
      {detail.repeats.map((repeat, index) => (
        <Line
          key={repeat.label}
          testID={`detail-repeat-${index}`}
          label={t('detail.repeat', { label: repeat.label, count: repeat.count })}
          amount={repeat.total}
        />
      ))}
    </Card>
  );
}

/** The biggest single purchases; each opens the expense. */
export function LargestCard({ detail, onOpen }: SectionProps & { onOpen: (id: number) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');
  if (detail.largest.length === 0) return null;

  return (
    <Card testID="detail-largest" style={styles.card}>
      <Typography variant="label">{t('detail.largestTitle')}</Typography>
      {detail.largest.map((item) => (
        <Pressable key={item.id} accessibilityRole="button" onPress={() => onOpen(item.id)}>
          <Line
            testID={`detail-largest-${item.id}`}
            label={item.note ?? displayCategoryName(item.subcategoryName ?? detail.categoryName)}
            meta={formatDateShort(item.date)}
            amount={item.amount}
          />
        </Pressable>
      ))}
    </Card>
  );
}

/** Fixed, variable and unexpected: what can be cut, and what cannot. */
export function SpendMixCard({ detail }: SectionProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');
  if (detail.spent <= 0) return null;

  const kinds = (['fixed', 'variable', 'unexpected'] as const).filter((kind) => detail.kinds[kind] > 0);
  return (
    <Card testID="detail-mix" style={styles.card}>
      <Typography variant="label">{t('detail.mixTitle')}</Typography>
      {kinds.map((kind) => (
        <Line
          key={kind}
          testID={`detail-kind-${kind}`}
          label={t(`detail.${kind}`)}
          meta={t(`detail.${kind}Hint`)}
          amount={detail.kinds[kind]}
        />
      ))}
    </Card>
  );
}

/** Within this share of the usual month (5%), the month reads as "about the same". */
const SAME_TOLERANCE = 0.05;

/**
 * This month against a usual one. The current month is compared on where its
 * pace leads (`heading`); a closed month on what was actually spent. A month
 * still to come has nothing to compare yet.
 */
export function UsualMonthCard({ detail, heading, timing }: SectionProps & { heading: number; timing: 'past' | 'current' | 'future' }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('budget');

  if (detail.average === null) {
    return (
      <Card style={styles.card}>
        <Typography variant="label">{t('detail.usualTitle')}</Typography>
        <Typography variant="muted" testID="detail-no-usual">{t('detail.noUsual')}</Typography>
      </Card>
    );
  }

  const diff = Math.round(heading - detail.average);
  const direction = Math.abs(diff) <= detail.average * SAME_TOLERANCE ? 'Same' : diff > 0 ? 'More' : 'Less';
  const prefix = timing === 'current' ? 'heading' : 'spent';

  return (
    <Card style={styles.card}>
      <Typography variant="label">{t('detail.usualTitle')}</Typography>
      <Typography testID="detail-usual">{t('detail.usual', { amount: formatCurrency(detail.average) })}</Typography>
      {timing === 'future' ? null : (
        <Typography variant="muted" testID="detail-compare">
          {t(`detail.${prefix}${direction}`, {
            amount: formatCurrency(Math.round(heading)),
            diff: formatCurrency(Math.abs(diff)),
          })}
        </Typography>
      )}
    </Card>
  );
}

const makeStyles = (_c: ThemeColors) => StyleSheet.create({
  card: {
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
});
