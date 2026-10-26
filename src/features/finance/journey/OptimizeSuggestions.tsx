import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ICON_SIZE } from '@/constants/icons';
import { RADIUS, SPACING } from '@/constants/layout';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { currentMonthISO } from '@/utils/formatDate';

import type { CutSuggestion } from './journey.types';

/**
 * The Optimize step's suggestions (UX-25, VS-65): where variable spending has
 * room, from the user's own first months. Each row opens the category's detail
 * for this month, by path, where its envelope and next month's plan live.
 * Suggestions only: nothing here sets a target.
 */
export function OptimizeSuggestions({ suggestions }: { suggestions: ReadonlyArray<CutSuggestion> }) {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { t } = useTranslation('journey');

  if (suggestions.length === 0) {
    return (
      <Typography variant="muted" testID="journey-suggestions-none">
        {t('optimize.none')}
      </Typography>
    );
  }

  return (
    <View style={styles.list}>
      <Typography variant="label">{t('optimize.suggestionsTitle')}</Typography>
      {suggestions.map((s) => (
        <Pressable
          key={s.categoryId}
          testID={`journey-suggestion-${s.categoryId}`}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/budget/category/[id]',
              params: { id: String(s.categoryId), month: currentMonthISO() },
            })
          }
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.grow}>
            <Typography>
              {t('optimize.suggestion', {
                category: displayCategoryName(s.categoryLabel),
                average: formatCurrency(s.average),
                lowest: formatCurrency(s.lowest),
              })}
            </Typography>
            <Typography style={styles.frees}>{t('optimize.frees', { amount: formatCurrency(s.frees) })}</Typography>
          </View>
          <Icon name="forward" size={ICON_SIZE.sm} color={c.TEXT_MUTED} />
        </Pressable>
      ))}
      <Typography variant="muted">{t('optimize.suggestionsHint')}</Typography>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    list: { gap: SPACING.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: c.SURFACE_MUTED,
    },
    pressed: { opacity: 0.75 },
    grow: { flex: 1, gap: 2 },
    frees: { color: c.PRIMARY_TEXT },
  });
