import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Typography } from '@/components/Typography';
import { BORDER, DANGER, PRIMARY_GREEN, SUCCESS } from '@/constants/colors';
import { FONT_FAMILY } from '@/constants/fonts';
import { formatCurrency } from '@/utils/formatCurrency';

import { MonthComparison } from './MonthComparison';
import { NavArrows } from './NavArrows';
import { OptimizationSuggestions } from './OptimizationSuggestions';
import { SpendingPieChart } from './SpendingPieChart';
import { useMonthlyReport } from './reports.hooks';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Formats a `YYYY-MM` string as a "Month YYYY" label. */
function monthLabel(monthISO: string): string {
  const [year, month] = monthISO.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** Capitalises a fund type for display ("emergency" → "Emergency"). */
function fundLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * The monthly report — the Reports tab root. Shows income vs expenses,
 * allocation/expense performance, a category pie chart and breakdown, fund and
 * project progress, debt totals, an optional month-over-month comparison, and
 * rule-based suggestions. Prev/next arrows browse months; "next" is disabled on
 * the current month. A link navigates to the weekly report.
 */
export function MonthlyReport() {
  const router = useRouter();
  const { report, monthISO, loading, error, goToPrevMonth, goToNextMonth, isCurrentMonth } =
    useMonthlyReport();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <NavArrows
        label={monthLabel(monthISO)}
        onPrev={goToPrevMonth}
        onNext={goToNextMonth}
        nextDisabled={isCurrentMonth}
        testIDPrefix="month-nav"
      />

      {error ? <Typography variant="muted">{error}</Typography> : null}
      {loading && !report ? <Typography variant="muted">Loading…</Typography> : null}

      {report ? (
        <>
          <Card>
            <View style={styles.summaryRow}>
              <View>
                <Typography variant="muted">Income</Typography>
                <Typography variant="subheading">{formatCurrency(report.incomeTotal)}</Typography>
              </View>
              <View style={styles.alignEnd}>
                <Typography variant="muted">Expenses</Typography>
                <Typography variant="subheading">
                  {formatCurrency(report.expensePerformance.actual)}
                </Typography>
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <Typography variant="subheading">Expense Performance</Typography>
            <PerfRow label="Planned" value={report.expensePerformance.planned} />
            <PerfRow label="Actual" value={report.expensePerformance.actual} />
            <PerfRow
              label="Remaining"
              value={report.expensePerformance.remaining}
              color={report.expensePerformance.remaining < 0 ? DANGER : SUCCESS}
            />
          </View>

          <View style={styles.section}>
            <Typography variant="subheading">Spending by Category</Typography>
            <SpendingPieChart data={report.categoryBreakdown} />
            {report.categoryBreakdown.map((c) => (
              <View key={c.categoryId} style={styles.row} testID={`month-category-${c.categoryId}`}>
                <Typography variant="body">{c.categoryLabel}</Typography>
                <View style={styles.alignEnd}>
                  <Typography variant="body">{formatCurrency(c.amount)}</Typography>
                  <Typography variant="muted">{Math.round(c.pct)}%</Typography>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Typography variant="subheading">Funds</Typography>
            {report.fundProgress.map((f) => (
              <View key={f.type} style={styles.progressBlock} testID={`fund-${f.type}`}>
                <View style={styles.progressLabel}>
                  <Typography variant="body">{fundLabel(f.type)}</Typography>
                  <Typography variant="muted">
                    {formatCurrency(f.current)}
                    {f.target !== null ? ` / ${formatCurrency(f.target)}` : ''}
                  </Typography>
                </View>
                <ProgressBar value={f.pct ?? 0} />
              </View>
            ))}
          </View>

          {report.projectProgress.length > 0 ? (
            <View style={styles.section}>
              <Typography variant="subheading">Projects</Typography>
              {report.projectProgress.map((p) => (
                <View key={p.id} style={styles.progressBlock} testID={`project-${p.id}`}>
                  <View style={styles.progressLabel}>
                    <Typography variant="body">{p.name}</Typography>
                    <Typography variant="muted">
                      {formatCurrency(p.funded)} / {formatCurrency(p.target)}
                    </Typography>
                  </View>
                  <ProgressBar value={p.pct} />
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Typography variant="subheading">Debt</Typography>
            <PerfRow label="Lent out" value={report.debtSummary.totalLent} />
            <PerfRow label="Owed" value={report.debtSummary.totalOwed} />
          </View>

          {report.comparison ? <MonthComparison comparison={report.comparison} /> : null}

          <OptimizationSuggestions suggestions={report.suggestions} />

          <Pressable
            testID="view-weekly-link"
            accessibilityRole="button"
            onPress={() => router.push('/reports/weekly')}
            style={styles.weeklyLink}
          >
            <Typography variant="body" style={styles.weeklyLinkText}>
              View Weekly Report →
            </Typography>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  );
}

/** A label + right-aligned currency value row used across the report sections. */
function PerfRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.row}>
      <Typography variant="body">{label}</Typography>
      <Typography variant="body" style={color ? { color } : undefined}>
        {formatCurrency(value)}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  alignEnd: { alignItems: 'flex-end' },
  section: { gap: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    paddingVertical: 8,
  },
  progressBlock: { gap: 4, paddingVertical: 4 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  weeklyLink: { paddingVertical: 12, alignItems: 'center' },
  weeklyLinkText: { color: PRIMARY_GREEN, fontFamily: FONT_FAMILY.WORK_SANS_SEMIBOLD },
});
