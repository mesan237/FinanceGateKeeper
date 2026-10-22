import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { Modal } from '@/components/Modal';
import { ProgressBar } from '@/components/ProgressBar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { FONT_FAMILY } from '@/constants/fonts';
import { SPACING } from '@/constants/layout';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateLong, formatDateShort } from '@/utils/formatDate';

import { EventFormSheet } from './EventFormSheet';
import { useEventDetail } from './events.hooks';
import type { EventExpense } from './events.types';

/** "Taxi" / "Gift basket · Food" / "Refund · Food": what the row was, in a few words. */
function expenseLabel(e: EventExpense, refundLabel: (category: string) => string): string {
  const category = displayCategoryName(e.subcategoryLabel ?? e.categoryLabel);
  if (e.refundOf !== null) return refundLabel(category);
  return e.note ? `${e.note} · ${category}` : category;
}

/**
 * One event's page (VS-61): what the occasion cost in all, split by category,
 * and every expense tagged with it. Edit and delete live here; deleting frees
 * the expenses, which keep their amounts.
 */
export function EventDetailScreen({ eventId }: { eventId: number }) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['events', 'common']);
  const { detail, loading, refresh, update, remove } = useEventDetail(eventId);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Expenses are edited elsewhere; re-read on return.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (loading && !detail) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="" />
        <LoadingState label={t('loading')} />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title={t('title')} />
        <Typography variant="muted" style={styles.body} testID="event-missing">
          {t('errors.notFound')}
        </Typography>
      </View>
    );
  }

  const { event } = detail;
  const handleDelete = async () => {
    await remove();
    setConfirmingDelete(false);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={event.name}
        rightAction={
          <Pressable testID="event-edit" accessibilityRole="button" onPress={() => setEditing(true)} hitSlop={8}>
            <Typography style={styles.action}>{t('detail.edit')}</Typography>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.body}>
        <Card style={styles.card}>
          <Typography variant="muted">{event.date ? formatDateLong(event.date) : t('list.noDate')}</Typography>
          <Typography variant="label">{t('detail.total')}</Typography>
          <Typography testID="event-total" style={styles.total}>{formatCurrency(detail.total)}</Typography>
        </Card>

        {detail.byCategory.length > 0 ? (
          <Card style={styles.card}>
            <Typography variant="label">{t('detail.byCategory')}</Typography>
            {detail.byCategory.map((c) => (
              <View key={c.categoryId} style={styles.part}>
                <View style={styles.line} testID={`event-category-${c.categoryId}`}>
                  <Typography style={styles.grow}>{displayCategoryName(c.categoryLabel)}</Typography>
                  <Typography style={styles.amount}>{formatCurrency(c.amount)}</Typography>
                </View>
                <ProgressBar value={detail.total > 0 ? Math.min(100, (c.amount / detail.total) * 100) : 0} style={styles.bar} />
              </View>
            ))}
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Typography variant="label">{t('detail.expenses')}</Typography>
          {detail.expenses.length === 0 ? (
            <Typography variant="muted">{t('detail.noExpenses')}</Typography>
          ) : (
            detail.expenses.map((e) => (
              <Pressable
                key={e.id}
                testID={`event-expense-${e.id}`}
                accessibilityRole="button"
                // A refund is managed from its purchase (VS-45).
                onPress={() => router.push(`/expenses/${e.refundOf ?? e.id}`)}
                style={styles.line}
              >
                <View style={styles.grow}>
                  <Typography numberOfLines={1}>
                    {expenseLabel(e, (category) => t('detail.refund', { category }))}
                  </Typography>
                  <Typography variant="muted" style={styles.meta}>{formatDateShort(e.date)}</Typography>
                </View>
                <Typography style={styles.amount}>{formatCurrency(e.amount)}</Typography>
              </Pressable>
            ))
          )}
        </Card>

        <Button
          testID="event-delete"
          label={t('detail.delete')}
          variant="danger"
          onPress={() => setConfirmingDelete(true)}
        />
      </ScrollView>

      <EventFormSheet
        visible={editing}
        initial={{ name: event.name, date: event.date }}
        onClose={() => setEditing(false)}
        onSave={async (input) => {
          await update(input);
          setEditing(false);
        }}
      />

      <Modal visible={confirmingDelete} onRequestClose={() => setConfirmingDelete(false)}>
        <View style={styles.modal}>
          <Typography variant="subheading">{t('detail.deleteTitle')}</Typography>
          <Typography variant="muted">{t('detail.deleteBody')}</Typography>
          <Button
            testID="event-delete-confirm"
            label={t('common:actions.delete')}
            variant="danger"
            onPress={() => void handleDelete()}
          />
          <Button label={t('common:actions.cancel')} onPress={() => setConfirmingDelete(false)} />
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1 },
    body: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
    card: { gap: SPACING.sm },
    total: { fontSize: 26, fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD, color: c.TEXT_PRIMARY },
    part: { gap: SPACING.xs },
    line: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xs },
    grow: { flex: 1 },
    meta: { fontSize: 11 },
    amount: { fontFamily: FONT_FAMILY.SPACE_GROTESK_SEMIBOLD },
    bar: { height: 4 },
    action: { color: c.PRIMARY_GREEN, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
    modal: { gap: SPACING.md },
  });
