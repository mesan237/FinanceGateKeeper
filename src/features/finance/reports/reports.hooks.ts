import { useCallback, useEffect, useState } from 'react';

import { addMonths, currentMonthISO, toISODate } from '@/utils/formatDate';

import * as reportsService from './reports.service';
import type { MonthlyReport, WeeklyReport } from './reports.types';

/** Returns the Monday of the current week as a `YYYY-MM-DD` string (UTC). */
function currentWeekMonday(): string {
  const d = new Date();
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // roll back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return toISODate(d);
}

/** Advances a `YYYY-MM-DD` date by `days` days (UTC-stable). */
function shiftDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/**
 * Loads the weekly report for the given week start (default: the current week's
 * Monday) and exposes prev/next navigation that shifts the window by 7 days.
 * `isCurrentWeek` is true when viewing the live week — the UI disables "next".
 */
export function useWeeklyReport(initialWeekStart?: string) {
  const [weekStart, setWeekStart] = useState(initialWeekStart ?? currentWeekMonday());
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    reportsService
      .getWeeklyReport(weekStart)
      .then((r) => {
        if (!active) return;
        setReport(r);
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load the weekly report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [weekStart]);

  const goToPrevWeek = useCallback(() => setWeekStart((w) => shiftDays(w, -7)), []);
  const goToNextWeek = useCallback(() => setWeekStart((w) => shiftDays(w, 7)), []);

  return {
    report,
    weekStart,
    loading,
    error,
    goToPrevWeek,
    goToNextWeek,
    isCurrentWeek: weekStart >= currentWeekMonday(),
  };
}

/**
 * Loads the monthly report for the given month (default: the current month) and
 * exposes prev/next navigation that shifts by one calendar month. `isCurrentMonth`
 * is true when viewing the live month — the UI disables "next".
 */
export function useMonthlyReport(initialMonthISO?: string) {
  const [monthISO, setMonthISO] = useState(initialMonthISO ?? currentMonthISO());
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    reportsService
      .getMonthlyReport(monthISO)
      .then((r) => {
        if (!active) return;
        setReport(r);
        setError(null);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Failed to load the monthly report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [monthISO]);

  const goToPrevMonth = useCallback(
    () => setMonthISO((m) => addMonths(`${m}-01`, -1).slice(0, 7)),
    [],
  );
  const goToNextMonth = useCallback(
    () => setMonthISO((m) => addMonths(`${m}-01`, 1).slice(0, 7)),
    [],
  );

  return {
    report,
    monthISO,
    loading,
    error,
    goToPrevMonth,
    goToNextMonth,
    isCurrentMonth: monthISO >= currentMonthISO(),
  };
}
