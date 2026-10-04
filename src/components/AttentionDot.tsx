import i18n from 'i18next';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import type { AttentionCounts } from '@/components/AttentionProvider';
import { RADIUS } from '@/constants/layout';
import { useTheme } from '@/theme';

const SIZE = 8;

export interface AttentionDotProps {
  counts: AttentionCounts;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * A small dot that says "something here needs you": red once anything is
 * overdue, amber while things are only due soon, and nothing at all otherwise.
 */
export function AttentionDot({ counts, style, testID }: AttentionDotProps) {
  const c = useTheme();
  if (counts.soon === 0 && counts.overdue === 0) return null;
  const color = counts.overdue > 0 ? c.DANGER : c.WARNING;
  return <View testID={testID} style={[styles.dot, { backgroundColor: color }, style]} />;
}

/**
 * The screen-reader hint that goes with a dot, e.g. "1 overdue, 2 due soon";
 * undefined when there is nothing to announce.
 */
export function attentionHint(counts: AttentionCounts): string | undefined {
  const parts: string[] = [];
  if (counts.overdue > 0) {
    parts.push(i18n.t('attention.overdue', { ns: 'navigation', count: counts.overdue }));
  }
  if (counts.soon > 0) {
    parts.push(i18n.t('attention.soon', { ns: 'navigation', count: counts.soon }));
  }
  return parts.length > 0 ? parts.join(', ') : undefined;
}

const styles = StyleSheet.create({
  dot: { width: SIZE, height: SIZE, borderRadius: RADIUS.full },
});
