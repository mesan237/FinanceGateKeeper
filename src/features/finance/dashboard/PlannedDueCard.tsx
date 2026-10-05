import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AttentionDot } from '@/components/AttentionDot';
import { useAttention } from '@/components/AttentionProvider';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { ATTENTION_PLANNED } from '@/constants/attention';
import { ICON_SIZE } from '@/constants/icons';
import { SPACING } from '@/constants/layout';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

/**
 * A dashboard reminder that planned purchases are coming due: how many are
 * overdue and how many are due soon, tapping through to the lists. Reads the
 * counts the planned feature publishes to `AttentionProvider`, so the dashboard
 * never imports that feature. Hidden while nothing needs attention.
 */
export function PlannedDueCard() {
  const styles = useThemedStyles(makeStyles);
  const c = useTheme();
  const router = useRouter();
  const { t } = useTranslation('dashboard');
  const counts = useAttention(ATTENTION_PLANNED);

  if (counts.soon === 0 && counts.overdue === 0) return null;

  return (
    <Pressable
      testID="planned-due-card"
      accessibilityRole="button"
      accessibilityLabel={t('planned.open')}
      onPress={() => router.push('/planned')}
    >
      <Card style={styles.card}>
        <AttentionDot counts={counts} />
        <View style={styles.text}>
          {counts.overdue > 0 ? (
            <Typography style={styles.overdue}>
              {t('planned.overdue', { count: counts.overdue })}
            </Typography>
          ) : null}
          {counts.soon > 0 ? (
            <Typography>{t('planned.dueSoon', { count: counts.soon })}</Typography>
          ) : null}
        </View>
        <Icon name="forward" size={ICON_SIZE.md} color={c.TEXT_MUTED} />
      </Card>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    text: { flex: 1, gap: 2 },
    overdue: { color: c.DANGER },
  });
