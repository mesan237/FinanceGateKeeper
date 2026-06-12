import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { BACKGROUND, PRIMARY_GREEN, TEXT_DISABLED, TEXT_MUTED } from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';
import { ICON_SIZE } from '@/constants/icons';
import type { TransactionEntry } from '@/types/transactions';
import { formatCurrency } from '@/utils/formatCurrency';
import { currentMonthISO, formatSectionDate } from '@/utils/formatDate';

import { CategoryChips } from './CategoryChips';
import { TransactionRow } from './TransactionRow';
import { useCategories, useTransactions } from './expenses.hooks';

interface Section {
  title: string;
  date: string;
  netTotal: number;
  data: TransactionEntry[];
}

function buildSections(entries: TransactionEntry[]): Section[] {
  const byDate = new Map<string, TransactionEntry[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.date) ?? [];
    list.push(entry);
    byDate.set(entry.date, list);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => (a > b ? -1 : 1));
  return sortedDates.map((date) => {
    const rows = byDate.get(date)!;
    // Transfers move money between wallets without entering or leaving the
    // budget, so they do not affect a day's net total. Positive = net spend.
    const netTotal = rows.reduce((acc, e) => {
      if (e.type === 'expense') return acc + e.amount;
      if (e.type === 'income') return acc - e.amount;
      return acc;
    }, 0);
    return { title: formatSectionDate(date), date, netTotal, data: rows };
  });
}

/** Formats a day's net as a signed figure: −spend, +income surplus. */
function formatNet(netTotal: number): string {
  if (netTotal > 0) return `−${formatCurrency(netTotal)}`;
  if (netTotal < 0) return `+${formatCurrency(-netTotal)}`;
  return formatCurrency(0);
}

export interface TransactionListProps {
  /**
   * Bump this to force a re-fetch without navigating — e.g. after an expense is
   * logged from the in-page `AddTransactionSheet`, which never leaves the tab.
   */
  reloadToken?: number;
}

/**
 * Unified income+expense feed grouped by calendar day, with month navigation.
 * The category chip row filters only expense rows; income rows always appear.
 */
export function TransactionList({ reloadToken }: TransactionListProps = {}) {
  const router = useRouter();
  const [monthISO, setMonthISO] = useState(() => currentMonthISO());
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const { entries, loading, error, refresh } = useTransactions(monthISO, selectedCategoryId);
  const { categories } = useCategories();

  // Re-fetch when the parent bumps the token (skip the initial 0 — the hook
  // already loads on mount).
  useEffect(() => {
    if (reloadToken) void refresh();
  }, [reloadToken, refresh]);

  const sections = useMemo(() => buildSections(entries), [entries]);
  const isCurrentMonth = monthISO === currentMonthISO();

  const prevMonth = () => {
    const [year, month] = monthISO.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 2, 1));
    setMonthISO(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [year, month] = monthISO.split('-').map(Number);
    const d = new Date(Date.UTC(year, month, 1));
    setMonthISO(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = (() => {
    const [year, month] = monthISO.split('-').map(Number);
    const names = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${names[month - 1]} ${year}`;
  })();

  return (
    <View style={styles.container}>
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <Pressable
          testID="month-nav-prev"
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={prevMonth}
          hitSlop={12}
        >
          <Icon name="back" size={ICON_SIZE.md} color={TEXT_MUTED} />
        </Pressable>
        <Typography variant="subheading">{monthLabel}</Typography>
        <Pressable
          testID="month-nav-next"
          accessibilityRole="button"
          accessibilityLabel="Next month"
          accessibilityState={{ disabled: isCurrentMonth }}
          onPress={isCurrentMonth ? undefined : nextMonth}
          hitSlop={12}
          style={isCurrentMonth ? styles.disabled : undefined}
        >
          <Icon
            name="forward"
            size={ICON_SIZE.md}
            color={isCurrentMonth ? TEXT_DISABLED : TEXT_MUTED}
          />
        </Pressable>
      </View>

      <CategoryChips
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
      />

      {error ? (
        <View style={styles.errorRow}>
          <Typography variant="muted" style={styles.errorText}>
            {error}
          </Typography>
          <Pressable testID="feed-retry" accessibilityRole="button" onPress={() => void refresh()}>
            <Typography style={styles.retryText}>Retry</Typography>
          </Pressable>
        </View>
      ) : null}

      {/* The list stays mounted while a refetch is in flight (it just dims), so
          month navigation never blanks the screen. The spinner only covers a
          cold load with nothing cached yet, and the empty message waits for the
          query to settle instead of flashing first. */}
      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          style={loading ? styles.refreshing : undefined}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Typography variant="muted" style={styles.sectionDate}>{section.title}</Typography>
              <Typography
                testID={`section-net-${section.date}`}
                variant="muted"
                style={styles.sectionNet}
              >
                {formatNet(section.netTotal)}
              </Typography>
            </View>
          )}
          renderItem={({ item }) => (
            <TransactionRow item={item} onPressExpense={(id) => router.push(`/expenses/${id}`)} />
          )}
        />
      ) : loading ? (
        <ActivityIndicator testID="feed-loading" color={PRIMARY_GREEN} style={styles.firstLoad} />
      ) : !error ? (
        <Typography variant="muted" style={styles.empty}>
          No transactions in {monthLabel}.
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  disabled: {
    opacity: 0.4,
  },
  listContent: {
    paddingBottom: 96,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: BACKGROUND,
  },
  sectionDate: {
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  sectionNet: {
    fontSize: 12,
  },
  empty: {
    marginTop: 24,
    textAlign: 'center',
  },
  firstLoad: {
    marginTop: 32,
  },
  refreshing: {
    opacity: 0.6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  errorText: {
    flex: 1,
  },
  retryText: {
    color: PRIMARY_GREEN,
    fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD,
  },
});
