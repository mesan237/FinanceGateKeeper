import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong, toISODate } from '@/utils/formatDate';

import { DueBadge } from './DueBadge';
import { NewListSheet } from './NewListSheet';
import { usePlannedLists } from './planned.hooks';
import type { PlannedList } from './planned.types';

/**
 * The shopping lists: each with how many items are still to buy and their
 * estimated total, plus when it is due. Tapping a list opens it; "New list"
 * starts a fresh one with its name and shopping day.
 * Reached from the drawer.
 */
export function PlannedListsScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation('planned');
  const { lists, loading, error, create } = usePlannedLists();
  const [creating, setCreating] = useState(false);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('title')} />

      {loading ? (
        <LoadingState />
      ) : lists.length === 0 ? (
        <EmptyState
          icon="planned"
          title={t('lists.emptyTitle')}
          subtitle={t('lists.emptySubtitle')}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {lists.map((list) => (
            <ListCard key={list.id} list={list} onPress={() => router.push(`/planned/${list.id}`)} />
          ))}
        </ScrollView>
      )}

      {error ? <Typography style={styles.error}>{error}</Typography> : null}

      <Button testID="planned-new-list" label={t('lists.add')} onPress={() => setCreating(true)} />

      <NewListSheet visible={creating} onClose={() => setCreating(false)} onCreate={create} />
    </View>
  );
}

function ListCard({ list, onPress }: { list: PlannedList; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('planned');
  // "All bought" only once there is something to have bought; an empty list says so.
  const summary =
    list.itemCount === 0
      ? t('lists.noItems')
      : list.openCount > 0
        ? t('lists.toBuy', { n: list.openCount, amount: formatCurrency(list.openEstimate) })
        : t('lists.allBought', { count: list.itemCount });
  // `createdAt` is a UTC timestamp; show the calendar day it was on the phone.
  const created = formatDateLong(toISODate(new Date(list.createdAt)));

  return (
    <Pressable testID={`planned-list-${list.id}`} accessibilityRole="button" onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.titleRow}>
          <Typography variant="subheading" style={styles.title}>
            {list.name}
          </Typography>
          {/* A finished or empty list has nothing left to be late with. */}
          {list.openCount > 0 || list.dueDate === null ? (
            <DueBadge dateISO={list.dueDate} testID={`planned-list-due-${list.id}`} />
          ) : null}
        </View>
        <Typography variant="muted">{summary}</Typography>
        <Typography variant="muted">{t('lists.created', { date: created })}</Typography>
      </Card>
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 12 },
    list: { gap: 12 },
    card: { gap: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1 },
    error: { color: c.DANGER },
  });
