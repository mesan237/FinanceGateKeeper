import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { WhyBreakdown } from '@/components/WhyBreakdown';
import { Typography } from '@/components/Typography';
import { SPACING } from '@/constants/layout';
import { TransactionRow } from '@/features/finance/expenses/TransactionRow';
import { displayCategoryName } from '@/i18n/categoryNames';
import { useThemedStyles, type ThemeColors } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { currentMonthISO } from '@/utils/formatDate';
import { monthLabel, nextMonthISO } from '@/utils/monthMath';

import { CategoryEnvelopeRow } from './CategoryEnvelopeRow';
import { NextMonthCard, UsualComparison, WhereItWentCard } from './CategoryDetailSections';
import { EnvelopeEditSheet } from './EnvelopeEditSheet';
import { useCategoryDetail } from './budget.categoryDetail.hooks';
import { useEnvelopeActions } from './budget.envelope.hooks';
import { planNextMonth } from './budget.nextMonth';
import type { SubcategoryFilter } from './budget.types';

export interface CategoryDetailScreenProps {
  /** `YYYY-MM`. */
  monthISO: string;
  categoryId: number;
  /** Narrows the screen to one subcategory (VS-59); omitted for the whole category. */
  subcategory?: SubcategoryFilter;
}

/**
 * One category's month, opened from its envelope on the Budget tab (VS-56).
 *
 * Cards, top to bottom: the envelope and how the month compares with a
 * usual one (as a percentage); where the money went, each part with its own
 * change; why it went — routine, events, unexpected, everyday (VS-62); next month's suggested budget and how to get there (the running month
 * only); and the transactions. Editing the envelope lives here, behind
 * "Edit budget".
 *
 * Tapping a subcategory in "Where it went" opens the same screen narrowed to it
 * (VS-59): its spend against its own usual month, its repeats and its
 * transactions. The envelope, editing and the next-month plan stay on the
 * category, since budgets are per category.
 */
export function CategoryDetailScreen({ monthISO, categoryId, subcategory }: CategoryDetailScreenProps) {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { t } = useTranslation(['budget', 'common']);
  const [editing, setEditing] = useState(false);

  const { view, loading, error, refresh } = useCategoryDetail(monthISO, categoryId, subcategory);
  const { setBudget, remove, coverFrom, error: writeError } = useEnvelopeActions(monthISO);
  const nextMonth = useEnvelopeActions(nextMonthISO(monthISO));

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
  const openPart = (sub: SubcategoryFilter) =>
    router.push({ pathname: '/budget/category/[id]', params: { id: String(categoryId), month: monthISO, sub: String(sub) } });
  const running = monthISO === currentMonthISO();

  if (loading && !view) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="" />
        <LoadingState label={t('loading')} />
      </View>
    );
  }

  const narrowed = view?.detail.subcategory ?? null;
  const categoryName = view ? displayCategoryName(view.detail.categoryName) : '';
  const name = narrowed
    ? t('detail.subTitle', {
        category: categoryName,
        subcategory: narrowed.name === null ? t('detail.noSubcategory') : displayCategoryName(narrowed.name),
      })
    : categoryName;
  // The envelope is the category's: shown, edited and planned only on the whole category.
  const envelope = view && !narrowed ? view.envelope : null;
  const spent = view?.detail.spent ?? 0;
  // A running month is judged on where its pace leads; a closed one on what it spent.
  // A subcategory runs at its category's pace (projection / spend so far).
  const pace = running && view?.envelope && view.envelope.spent > 0 ? view.envelope.projected / view.envelope.spent : 1;
  const heading = spent * pace;
  const scale = pace;
  const plan = view && running && !narrowed ? planNextMonth(view.detail, heading) : null;
  const empty = !view || (spent === 0 && view.transactions.length === 0);

  return (
    <View style={styles.screen}>
      <ScreenHeader title={name} />
      {view ? (
        <ScrollView contentContainerStyle={styles.container} testID="category-detail">
          <Typography variant="muted">{monthLabel(monthISO)}</Typography>

          {envelope ? (
            <Card style={styles.card}>
              <CategoryEnvelopeRow envelope={envelope} first onPress={() => setEditing(true)} />
              {spent > 0 ? <UsualComparison detail={view.detail} heading={heading} running={running} /> : null}
              <Button
                testID="detail-edit-budget"
                label={t('detail.editBudget')}
                variant="secondary"
                compact
                onPress={() => setEditing(true)}
              />
            </Card>
          ) : null}

          {narrowed && spent > 0 ? (
            <Card style={styles.card}>
              <Typography testID="detail-sub-spent">
                {t('detail.subSpent', { amount: formatCurrency(spent) })}
              </Typography>
              <UsualComparison detail={view.detail} heading={heading} running={running} />
            </Card>
          ) : null}

          {empty ? (
            <Typography variant="muted" testID="detail-nothing-spent">
              {t('detail.nothingSpent', { category: name, month: monthLabel(monthISO) })}
            </Typography>
          ) : (
            <>
              <WhereItWentCard detail={view.detail} scale={scale} onOpenPart={openPart} />
              {/* Why the money went (VS-62); an event opens its page, by path. */}
              <WhyBreakdown
                totals={view.detail.reasons}
                events={view.detail.reasonEvents}
                onOpenEvent={(id) => router.push(`/events/${id}`)}
              />
              {plan ? (
                <NextMonthCard
                  plan={plan}
                  nextMonthBudget={view.nextMonthBudget}
                  onUseTarget={(amount) => void write(nextMonth.setBudget(categoryId, amount))}
                />
              ) : null}
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

      {error ?? nextMonth.error ? (
        <Typography style={styles.error} testID="detail-error">
          {error ?? nextMonth.error}
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
