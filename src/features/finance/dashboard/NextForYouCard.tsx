import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { useJourneyStage } from '@/components/JourneyStageProvider';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE, type IconName } from '@/constants/icons';
import { SPACING } from '@/constants/layout';
import { getDueItems } from '@/features/finance/budget/budget.committed';
import type { DueItem, DueKind } from '@/features/finance/budget/budget.types';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import type { JourneyStepKey } from '@/types/journey';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateShort, toISODate } from '@/utils/formatDate';
import { nextMonthISO } from '@/utils/monthMath';

const KIND_ICON: Record<DueKind, IconName> = {
  recurring: 'calendar',
  planned: 'planned',
  debt: 'debt',
  tontine: 'tontine',
};

/** Where the step's prompt leads when nothing is due (04 §8.4). */
function promptRoute(stage: JourneyStepKey, monthISO: string) {
  if (stage === 'plan') return { pathname: '/budget/plan' as const, params: { month: nextMonthISO(monthISO) } };
  if (stage === 'grow') return '/goals' as const;
  return '/path' as const;
}

export interface NextForYouCardProps {
  /** `YYYY-MM-DD`; today by default. Explicit for tests. */
  todayISO?: string;
}

/**
 * "Next for you" on Home (04 §7.3, 05 §10.3): the most urgent payment due
 * before month end — a tontine contribution, a debt instalment, a bill, a
 * planned purchase — overdue first, with "+ N more" opening every one by date.
 * The list is the Budget tab's committed money item by item
 * (`budget.getDueItems`, approved `dashboard → budget`), so the two agree.
 * Facts and obligations show at every step; with nothing due, the journey step
 * leads instead (keep logging, read your first months, plan next month, cut,
 * fund a goal). Re-reads on focus. It replaced the planned-purchases-only card.
 */
export function NextForYouCard({ todayISO = toISODate(new Date()) }: NextForYouCardProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { t } = useTranslation('dashboard');
  const stage = useJourneyStage();
  const monthISO = todayISO.slice(0, 7);
  const [items, setItems] = useState<DueItem[] | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setItems(await getDueItems(monthISO));
    } catch {
      setItems([]);
    }
  }, [monthISO]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (items === null) return null;

  const when = (date: string) =>
    date < todayISO
      ? t('next.overdue', { date: formatDateShort(date) })
      : date === todayISO
        ? t('next.today')
        : t('next.due', { date: formatDateShort(date) });

  const row = (item: DueItem, testID: string) => (
    <View style={styles.row} testID={testID}>
      <Icon name={KIND_ICON[item.kind]} size={ICON_SIZE.md} color={c.TEXT_MUTED} />
      <View style={styles.grow}>
        <Typography>{item.label}</Typography>
        <Typography variant="muted" style={item.date < todayISO && styles.overdue}>
          {when(item.date)}
        </Typography>
      </View>
      <Typography style={styles.amount}>{formatCurrency(item.amount)}</Typography>
    </View>
  );

  if (items.length === 0) {
    if (stage === null) return null;
    return (
      <Pressable testID="next-for-you" accessibilityRole="button" onPress={() => router.push(promptRoute(stage, monthISO))}>
        <Card style={styles.card}>
          <Typography variant="label">{t('next.title')}</Typography>
          <View style={styles.row} testID="next-prompt">
            <Typography style={[styles.grow, styles.prompt]}>{t(`next.prompt.${stage}`)}</Typography>
            <Icon name="forward" size={ICON_SIZE.sm} color={c.PRIMARY_TEXT} />
          </View>
        </Card>
      </Pressable>
    );
  }

  const [first, ...rest] = items;
  return (
    <>
      <Card testID="next-for-you" style={styles.card}>
        <Typography variant="label">{t('next.title')}</Typography>
        {row(first, 'next-first')}
        {rest.length > 0 ? (
          <Pressable testID="next-more" accessibilityRole="button" onPress={() => setOpen(true)} hitSlop={8}>
            <Typography style={styles.prompt}>{t('next.more', { count: rest.length })}</Typography>
          </Pressable>
        ) : null}
      </Card>

      <BottomSheet visible={open} onClose={() => setOpen(false)} testID="next-sheet">
        <View style={styles.sheet}>
          <Typography variant="subheading">{t('next.sheetTitle')}</Typography>
          {items.map((item, i) => (
            <React.Fragment key={`${item.kind}-${item.label}-${item.date}-${i}`}>{row(item, `next-item-${i}`)}</React.Fragment>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { gap: SPACING.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    grow: { flex: 1 },
    amount: { fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
    overdue: { color: c.DANGER_TEXT },
    prompt: { color: c.PRIMARY_TEXT, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
    sheet: { gap: SPACING.md },
  });
