import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE } from '@/constants/icons';
import { RADIUS, SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors, useTheme } from '@/theme';
import { SPEND_REASONS, type ReasonEvent, type ReasonTotals, type SpendReason } from '@/types/reasons';
import { formatCurrency } from '@/utils/formatCurrency';

export interface WhyBreakdownProps {
  totals: ReasonTotals;
  /** The events behind the "Events" share, listed under it; tappable with `onOpenEvent`. */
  events?: ReadonlyArray<ReasonEvent>;
  onOpenEvent?: (eventId: number) => void;
  /** Closes the card, under a rule — Reports puts the month's imprévus here (UX-14). */
  footer?: React.ReactNode;
  /** How many expenses a reason holds, shown in its row (Reports passes the imprévus count). */
  counts?: Partial<Record<SpendReason, number>>;
}

/**
 * Why the money went (VS-62): one bar split into routine, events, unexpected and
 * everyday spending, then a row per reason with its amount and share — and the
 * events behind the "Events" row. Shared by the Budget category detail and
 * Reports so both answer "why" the same way. Draws its own card, and renders
 * nothing at all without spending and without a footer, so an empty month
 * leaves no empty box. Each event row says how many expenses it holds and,
 * when it opens, shows a chevron: an event is a tag on transactions.
 */
export function WhyBreakdown({ totals, events = [], onOpenEvent, footer, counts }: WhyBreakdownProps) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const { t } = useTranslation();
  const total = SPEND_REASONS.reduce((sum, r) => sum + totals[r], 0);
  if (total <= 0 && !footer) return null;

  // Kind colours, never status ones (UX-15).
  const colorOf: Record<SpendReason, string> = {
    routine: c.KIND_ROUTINE,
    event: c.KIND_EVENT,
    unexpected: c.KIND_UNEXPECTED,
    everyday: c.KIND_EVERYDAY,
  };
  const shown = SPEND_REASONS.filter((r) => totals[r] > 0);

  return (
    <Card testID="why" style={styles.body}>
      <Typography variant="label">{t('why.title')}</Typography>
      {total > 0 ? (
        <View style={styles.bar}>
          {shown.map((r) => (
            <View key={r} style={{ flex: totals[r], backgroundColor: colorOf[r] }} />
          ))}
        </View>
      ) : null}
      {shown.map((r) => (
        <View key={r}>
          <View style={styles.row} testID={`why-${r}`}>
            <View testID={`why-${r}-dot`} style={[styles.dot, { backgroundColor: colorOf[r] }]} />
            <View style={styles.grow}>
              <Typography>{t(`why.${r}`)}</Typography>
              <Typography variant="muted" style={styles.hint}>
                {counts?.[r] ? `${t('why.expenses', { count: counts[r] })} · ${t(`why.${r}Hint`)}` : t(`why.${r}Hint`)}
              </Typography>
            </View>
            <Typography style={styles.amount}>{formatCurrency(totals[r])}</Typography>
            <Typography variant="muted" style={styles.share}>{`${Math.round((totals[r] / total) * 100)}%`}</Typography>
          </View>
          {r === 'event'
            ? events.map((e) => (
                <Pressable
                  key={e.eventId}
                  testID={`why-event-${e.eventId}`}
                  accessibilityRole="button"
                  disabled={!onOpenEvent}
                  onPress={() => onOpenEvent?.(e.eventId)}
                  style={[styles.row, styles.eventRow]}
                >
                  <View style={styles.grow}>
                    <Typography numberOfLines={1}>{e.name}</Typography>
                    <Typography variant="muted" style={styles.hint}>
                      {t('why.expenses', { count: e.count })}
                    </Typography>
                  </View>
                  <Typography variant="muted">{formatCurrency(e.amount)}</Typography>
                  {onOpenEvent ? (
                    <View testID={`why-event-${e.eventId}-open`}>
                      <Icon name="forward" size={ICON_SIZE.sm} color={c.TEXT_MUTED} />
                    </View>
                  ) : null}
                </Pressable>
              ))
            : null}
        </View>
      ))}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Card>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    body: { gap: SPACING.sm },
    bar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: RADIUS.full,
      overflow: 'hidden',
      backgroundColor: c.SURFACE_MUTED,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.xs },
    eventRow: { paddingLeft: SPACING.xl },
    dot: { width: 8, height: 8, borderRadius: RADIUS.full },
    grow: { flex: 1 },
    hint: { fontSize: 11 },
    amount: { fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD },
    share: { width: 40, textAlign: 'right', fontSize: 12 },
    footer: {
      gap: SPACING.xs,
      marginTop: SPACING.xs,
      paddingTop: SPACING.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.BORDER,
    },
  });
