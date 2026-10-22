import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong } from '@/utils/formatDate';

import { EventFormSheet } from './EventFormSheet';
import { useEvents } from './events.hooks';
import type { NewSpendingEvent } from './events.types';

/**
 * The events list (VS-61): each occasion with what it cost. Re-reads on focus,
 * since expenses are tagged from the expense screens. A new event opens straight
 * away, ready to be picked on the expenses it causes.
 */
export function EventsScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation('events');
  const { events, loading, error, refresh, create } = useEvents();
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const save = async (input: NewSpendingEvent) => {
    const id = await create(input);
    setCreating(false);
    router.push(`/events/${id}`);
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('title')} />

      {loading && events.length === 0 ? (
        <Typography variant="muted" style={styles.body}>{t('loading')}</Typography>
      ) : events.length === 0 ? (
        <EmptyState
          testID="events-empty"
          icon="event"
          title={t('list.emptyTitle')}
          subtitle={t('list.emptySubtitle')}
          actionLabel={t('list.add')}
          onAction={() => setCreating(true)}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Typography variant="muted">{t('intro')}</Typography>
          {events.map((event) => (
            <Pressable
              key={event.id}
              testID={`event-row-${event.id}`}
              accessibilityRole="button"
              onPress={() => router.push(`/events/${event.id}`)}
            >
              <Card style={styles.row}>
                <View style={styles.grow}>
                  <Typography style={styles.name}>{event.name}</Typography>
                  <Typography variant="muted">
                    {`${event.date ? formatDateLong(event.date) : t('list.noDate')} · ${t('list.count', { count: event.count })}`}
                  </Typography>
                </View>
                <Typography style={styles.name}>{formatCurrency(event.total)}</Typography>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {error ? <Typography style={[styles.body, styles.error]}>{error}</Typography> : null}

      {events.length > 0 ? (
        <View style={styles.footer}>
          <Button testID="events-add" label={t('list.add')} onPress={() => setCreating(true)} />
        </View>
      ) : null}

      <EventFormSheet visible={creating} onClose={() => setCreating(false)} onSave={save} />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    body: { padding: SPACING.lg },
    list: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    grow: { flex: 1 },
    name: { fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD, color: c.TEXT_PRIMARY },
    footer: { padding: SPACING.lg },
    error: { color: c.DANGER },
  });
