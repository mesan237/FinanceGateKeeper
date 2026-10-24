import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

/** One line of a breakdown: a labelled amount, added to or taken from the line above. */
export interface BreakdownLine {
  label: string;
  /** What the line is, in a few words, beneath the label. */
  hint?: string;
  amount: number;
  /** `minus` shows "−X", `plus` shows "+X"; omitted, the amount stands as the starting figure. */
  sign?: 'minus' | 'plus';
  /** A second line under the amount, such as what a total is made of. */
  detail?: string;
  testID?: string;
  hintTestID?: string;
}

export interface BudgetBreakdownSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  lines: BreakdownLine[];
  /** The figure the lines add up to, shown under a rule. */
  total: { label: string; amount: number; testID: string };
  /** A sentence under the sum, for a figure that needs words (a shortfall, an expected income). */
  note?: string | null;
  testID: string;
}

/** Formats a line's amount with its sign, so the sheet reads as a sum. */
function signed(line: BreakdownLine): string {
  if (line.sign === 'minus') return `−${formatCurrency(line.amount)}`;
  if (line.sign === 'plus') return `+${formatCurrency(line.amount)}`;
  return formatCurrency(line.amount);
}

/**
 * A Budget-tab figure opened up as the sum behind it (UX-13): each part on its
 * own line with a sign, then the result. The tab shows only the result, so the
 * arithmetic stays one tap away and can be checked.
 */
export function BudgetBreakdownSheet({
  visible,
  onClose,
  title,
  lines,
  total,
  note,
  testID,
}: BudgetBreakdownSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');

  return (
    <BottomSheet visible={visible} onClose={onClose} testID={testID}>
      <View style={styles.body}>
        <Typography variant="subheading">{title}</Typography>
        {lines.map((line) => (
          <View key={line.label} style={styles.line}>
            <View style={styles.grow}>
              <Typography>{line.label}</Typography>
              {line.hint ? (
                <Typography variant="muted" testID={line.hintTestID}>
                  {line.hint}
                </Typography>
              ) : null}
              {line.detail ? <Typography variant="muted">{line.detail}</Typography> : null}
            </View>
            <Typography style={styles.amount} testID={line.testID}>
              {signed(line)}
            </Typography>
          </View>
        ))}
        <View style={[styles.line, styles.total]}>
          <Typography style={[styles.grow, styles.strong]}>{total.label}</Typography>
          <Typography style={[styles.amount, styles.strong]} testID={total.testID}>
            {formatCurrency(total.amount)}
          </Typography>
        </View>
        {note ? <Typography variant="muted">{note}</Typography> : null}
        <Button label={t('actions.close')} variant="ghost" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    body: { gap: SPACING.md },
    line: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
    grow: { flex: 1 },
    amount: { fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD },
    total: {
      paddingTop: SPACING.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.BORDER_STRONG,
    },
    strong: { fontFamily: FONT_FAMILY.SPACE_GROTESK_BOLD },
  });
