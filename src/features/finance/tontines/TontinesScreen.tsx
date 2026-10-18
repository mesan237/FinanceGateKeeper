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

import { TontineCard } from './TontineCard';
import { useTontines } from './tontines.hooks';

/**
 * The tontines list (VS-51): every group the user belongs to, with its turn,
 * progress and position. Re-reads on focus, since payments are made on the
 * detail screen.
 */
export function TontinesScreen() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation('tontines');
  const { tontines, loading, error, refresh } = useTontines();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const create = () => router.push('/tontines/create');

  return (
    <View style={styles.screen}>
      <ScreenHeader title={t('title')} />

      {loading && tontines.length === 0 ? (
        <Typography variant="muted" style={styles.body}>
          {t('loading')}
        </Typography>
      ) : tontines.length === 0 ? (
        <EmptyState
          testID="tontines-empty"
          icon="tontine"
          title={t('list.emptyTitle')}
          subtitle={t('list.emptySubtitle')}
          actionLabel={t('list.add')}
          onAction={create}
        />
      ) : (
        <ScrollView style={styles.grow} contentContainerStyle={styles.list}>
          <Typography variant="muted">{t('intro')}</Typography>
          {tontines.map((tontine) => (
            <TontineCard key={tontine.id} tontine={tontine} onPress={() => router.push(`/tontines/${tontine.id}`)} />
          ))}
        </ScrollView>
      )}

      {error ? <Typography style={styles.error}>{error}</Typography> : null}

      {tontines.length > 0 ? (
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
