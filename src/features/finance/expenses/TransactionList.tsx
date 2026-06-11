import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Typography } from '@/components/Typography';
import { BACKGROUND, DANGER, PRIMARY_GREEN, SUCCESS, TEXT_MUTED } from '@/constants/colors';
import { ICON_SIZE } from '@/constants/icons';
import { getCategoryAvatar, getTransactionIcon } from '@/constants/categoryIcons';
import type { ExpenseEntry, IncomeEntry, TransactionEntry } from '@/types/transactions';
import { formatCurrency } from '@/utils/formatCurrency';
import { currentMonthISO, formatSectionDate } from '@/utils/formatDate';

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
    // budget, so they do not affect a day's net total.
    const netTotal = rows.reduce((acc, e) => {
      if (e.type === 'expense') return acc + e.amount;
      if (e.type === 'income') return acc - e.amount;
      return acc;
    }, 0);
    return { title: formatSectionDate(date), date, netTotal, data: rows };
  });
}

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Typography style={active ? styles.chipTextActive : undefined}>{label}</Typography>
    </Pressable>
  );
}

interface RowIconProps {
  entry: ExpenseEntry | IncomeEntry;
}

function RowIcon({ entry }: RowIconProps) {
  const emoji =
    entry.type === 'income'
      ? getTransactionIcon('income', undefined, entry.source)
      : getTransactionIcon('expense', entry.categoryId);

  if (emoji) {
    return (
      <Typography testID={`tx-icon-${entry.type}-${entry.id}`} style={styles.rowEmoji}>
        {emoji}
      </Typography>
    );
  }

  const label = entry.type === 'expense' ? entry.categoryLabel : entry.sourceLabel;
  const avatar = getCategoryAvatar(label);
  return (
    <View
      testID={`tx-avatar-${entry.type}-${entry.id}`}
      style={[styles.avatar, { backgroundColor: avatar.color }]}
    >
      <Typography style={styles.avatarLetter}>{avatar.letter}</Typography>
    </View>
  );
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
  const { entries, loading, refresh } = useTransactions(monthISO, selectedCategoryId);
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
          style={isCurrentMonth ? styles.disabled : undefined}
        >
          <Icon name="forward" size={ICON_SIZE.md} color={isCurrentMonth ? '#C0C0C0' : TEXT_MUTED} />
        </Pressable>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        <Chip label="All" active={selectedCategoryId === null} onPress={() => setSelectedCategoryId(null)} />
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            active={selectedCategoryId === cat.id}
            onPress={() => setSelectedCategoryId(cat.id)}
          />
        ))}
      </ScrollView>

      {loading ? null : sections.length === 0 ? (
        <Typography variant="muted" style={styles.empty}>
          No transactions in {monthLabel}.
        </Typography>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Typography variant="muted" style={styles.sectionDate}>{section.title}</Typography>
              <Typography
                testID={`section-net-${section.date}`}
                variant="muted"
                style={styles.sectionNet}
              >
                {formatCurrency(Math.abs(section.netTotal))}
              </Typography>
            </View>
          )}
          renderItem={({ item }) => {
            if (item.type === 'transfer') {
              return (
                <View
                  testID={`tx-row-transfer-${item.id}`}
                  style={[styles.row, styles.rowTransferBorder]}
                >
                  <Typography style={styles.rowEmoji}>⇄</Typography>
                  <Typography style={styles.rowLabel}>
                    {item.fromAccountName} → {item.toAccountName}
                  </Typography>
                  <Typography style={styles.rowAmountTransfer}>
                    {formatCurrency(item.amount)}
                  </Typography>
                </View>
              );
            }

            const label =
              item.type === 'expense'
                ? (item.subcategoryLabel ?? item.categoryLabel)
                : item.sourceLabel;
            const isIncome = item.type === 'income';

            const rowContent = (
              <>
                <RowIcon entry={item} />
                <View style={styles.rowLabel}>
                  <Typography>{label}</Typography>
                  {item.accountLabel ? (
                    <Typography
                      testID={`tx-account-chip-${item.type}-${item.id}`}
                      variant="muted"
                      style={styles.accountChip}
                    >
                      {item.accountLabel}
                    </Typography>
                  ) : null}
                </View>
                <Typography style={isIncome ? styles.rowAmountIncome : styles.rowAmountExpense}>
                  {isIncome ? formatCurrency(item.amount) : `−${formatCurrency(item.amount)}`}
                </Typography>
              </>
            );

            if (isIncome) {
              return (
                <View
                  testID={`tx-row-income-${item.id}`}
                  style={[styles.row, styles.rowIncomeBorder]}
                >
                  {rowContent}
                </View>
              );
            }

            return (
              <Pressable
                testID={`tx-row-expense-${item.id}`}
                onPress={() => router.push(`/expenses/${item.id}`)}
                style={[styles.row, styles.rowExpenseBorder]}
              >
                {rowContent}
              </Pressable>
            );
          }}
        />
      )}
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
  chipsScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: BACKGROUND,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipActive: {
    backgroundColor: PRIMARY_GREEN,
    borderColor: PRIMARY_GREEN,
  },
  chipTextActive: {
    color: '#FFFFFF',
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
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  sectionNet: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    borderLeftWidth: 3,
    paddingLeft: 10,
  },
  rowIncomeBorder: {
    borderLeftColor: SUCCESS,
  },
  rowExpenseBorder: {
    borderLeftColor: TEXT_MUTED,
  },
  rowTransferBorder: {
    borderLeftColor: PRIMARY_GREEN,
  },
  rowLabel: {
    flex: 1,
  },
  accountChip: {
    fontSize: 11,
    marginTop: 2,
  },
  rowAmountTransfer: {
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  rowAmountIncome: {
    color: SUCCESS,
    fontWeight: '600',
  },
  rowAmountExpense: {
    color: DANGER,
    fontWeight: '600',
  },
  rowEmoji: {
    fontSize: 22,
    lineHeight: 28,
    width: 26,
    textAlign: 'center',
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  empty: {
    marginTop: 24,
    textAlign: 'center',
  },
});
