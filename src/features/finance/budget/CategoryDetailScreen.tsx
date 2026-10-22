import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { TransactionRow } from '@/features/finance/expenses/TransactionRow';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { currentMonthISO } from '@/utils/formatDate';
import { monthLabel } from '@/utils/monthMath';

import { CategoryEnvelopeRow } from './CategoryEnvelopeRow';
import {
  LargestCard,
  RepeatsCard,
  SpendMixCard,
  UsualMonthCard,
  WhereItWentCard,
} from './CategoryDetailSections';
import { EnvelopeEditSheet } from './EnvelopeEditSheet';
import { useCategoryDetail } from './budget.categoryDetail.hooks';
import { useEnvelopeActions } from './budget.envelope.hooks';

export interface CategoryDetailScreenProps {
  /** `YYYY-MM`. */
  monthISO: string;
  categoryId: number;
}

/**
 * One category's month, opened from its envelope on the Budget tab (VS-56).
 *
 * Reads as "where should I cut?": the envelope at the top, then where the money
 * went by subcategory, the small purchases that keep coming back, the biggest
 * ones, how much of it is fixed, how the month compares with a usual one, and
 * every transaction. Editing the envelope moved here from the tab, behind
 * "Edit budget".
 */
export function CategoryDetailScreen({ monthISO, categoryId }: CategoryDetailScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['budget', 'common']);
  const [editing, setEditing] = useState(false);

  const { view, loading, error, refresh } = useCategoryDetail(monthISO, categoryId);
  const { setBudget, remove, coverFrom, error: writeError } = useEnvelopeActions(monthISO);

  // Tapping a transaction opens it for editing elsewhere; re-read on return.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const write = async (pending: Promise<boolean>): Promise<boolean> => {
    const ok = await pending;
    if (ok) await refresh();
    return ok;
  };

  const openExpense = (id: number) => router.push(`/expenses/${id}`);
  const now = currentMonthISO();
  const timing = monthISO < now ? 'past' : monthISO === now ? 'current' : 'future';

  if (loading && !view) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="" />
        <LoadingState label={t('loading')} />
      </View>
    );
  }

  const name = view ? displayCategoryName(view.detail.categoryName) : '';
  const envelope = view?.envelope ?? null;

  return (
    <View style={styles.screen}>
      <ScreenHeader title={name} />
      {view ? (
        <ScrollView contentContainerStyle={styles.container} testID="category-detail">
          <Typography variant="muted">{monthLabel(monthISO)}</Typography>

          {envelope ? (
            <Card style={styles.card}>
              <CategoryEnvelopeRow envelope={envelope} first onPress={() => setEditing(true)} />
              <Button
                testID="detail-edit-budget"
                label={t('detail.editBudget')}
                variant="secondary"
                compact
                onPress={() => setEditing(true)}
              />
            </Card>
          ) : null}

          {view.detail.spent === 0 && view.transactions.length === 0 ? (
            <Typography variant="muted" testID="detail-nothing-spent">
              {t('detail.nothingSpent', { category: name, month: monthLabel(monthISO) })}
            </Typography>
          ) : (
            <>
              <WhereItWentCard detail={view.detail} />
              <RepeatsCard detail={view.detail} />
              <LargestCard detail={view.detail} onOpen={openExpense} />
              <SpendMixCard detail={view.detail} />
              <UsualMonthCard
                detail={view.detail}
                timing={timing}
                heading={timing === 'current' ? envelope?.projected ?? view.detail.spent : view.detail.spent}
              />
              <Card testID="detail-transactions">
                <Typography variant="label">{t('detail.transactionsTitle')}</Typography>
                {view.transactions.map((item) => (
                  <TransactionRow
                    key={item.id}
                    item={item}
                    onPressExpense={openExpense}
                    onPressIncome={() => undefined}
                  />
                ))}
              </Card>
            </>
          )}
        </ScrollView>
      ) : null}

      {error ? (
        <Typography style={styles.error} testID="detail-error">
          {error}
        </Typography>
      ) : null}

      <EnvelopeEditSheet
        envelope={editing ? envelope : null}
        coverSources={view?.coverSources ?? []}
        error={writeError}
        onClose={() => setEditing(false)}
        onSave={(id, amount, rollover) => write(setBudget(id, amount, rollover))}
        onCoverFrom={(fromId, toId, amount) => write(coverFrom(fromId, toId, amount))}
        onRemove={(id) => write(remove(id))}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  card: {
    gap: SPACING.md,
  },
  error: {
    color: c.DANGER,
    padding: SPACING.lg,
  },
});
