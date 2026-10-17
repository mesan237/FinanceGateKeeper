import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';

import { GoalCard } from './GoalCard';
import { useGoals } from './goals.hooks';

/**
 * The goals list (VS-48): each starter buffer and sinking fund with its
 * progress, read from the wallet that holds its money. Re-reads on focus,
 * because saving into a goal happens on the transfer screen.
 */
export function GoalsScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation('goals');
  const { goals, loading, error, refresh } = useGoals();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const create = () => router.push('/goals/create');

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('title')} />

      {loading && goals.length === 0 ? (
        <Typography variant="muted" style={styles.body}>
          {t('loading')}
        </Typography>
      ) : goals.length === 0 ? (
        <EmptyState
          testID="goals-empty"
          icon="goal"
          title={t('list.emptyTitle')}
          subtitle={t('list.emptySubtitle')}
          actionLabel={t('list.add')}
          onAction={create}
        />
      ) : (
        <ScrollView style={styles.grow} contentContainerStyle={styles.list}>
          <Typography variant="muted">{t('intro')}</Typography>
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => router.push(`/goals/${goal.id}`)}
              onSave={() => router.push({ pathname: '/transfers/log', params: { to: String(goal.accountId) } })}
            />
          ))}
        </ScrollView>
      )}

      {error ? <Typography style={styles.error}>{error}</Typography> : null}

      {goals.length > 0 ? (
        <View style={styles.footer}>
          <Button label={t('list.add')} onPress={create} />
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    body: { paddingHorizontal: SPACING.lg },
    grow: { flex: 1 },
    list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, gap: SPACING.md },
    footer: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
    error: { color: c.DANGER, paddingHorizontal: SPACING.lg },
  });
