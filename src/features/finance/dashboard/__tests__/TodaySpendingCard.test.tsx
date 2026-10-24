import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { TodaySpendingCard } from '@/features/finance/dashboard/TodaySpendingCard';
import i18n from '@/i18n';

const TREND = [0, 1000, 0, 2500, 0, 0, 5000];

describe('TodaySpendingCard', () => {
  describe('today and the daily figure', () => {
    it("shows today's spending and date", () => {
      render(
        <TodaySpendingCard
          todaySpending={5000}
          safeDailySpend={2000}
          spendingTrend={TREND}
          today="Thursday, 18 June 2026"
        />,
      );
      expect(screen.getByTestId('today-spending')).toBeTruthy();
      expect(screen.getByText('5 000 FCFA')).toBeTruthy();
      expect(screen.getByText('Thursday, 18 June 2026')).toBeTruthy();
    });

    it("shows the Budget tab's per-day figure as 'A day to stay on plan' (UX-11)", () => {
      render(
        <TodaySpendingCard
          todaySpending={5000}
          safeDailySpend={2000}
          spendingTrend={TREND}
          today="today"
        />,
      );
      expect(screen.getByTestId('today-per-day')).toHaveTextContent(
        'A day to stay on plan: 2 000 FCFA',
      );
    });

    it('rounds the figure as the Budget tab does', () => {
      render(
        <TodaySpendingCard
          todaySpending={0}
          safeDailySpend={90000 / 22}
          spendingTrend={TREND}
          today="today"
        />,
      );
      // 4 090.9… shows as 4 091 on both screens.
      expect(screen.getByTestId('today-per-day')).toHaveTextContent(/4 091 FCFA$/);
    });

    it('shows 0 once the plan is used up, as the Budget tab does', () => {
      render(
        <TodaySpendingCard
          todaySpending={3000}
          safeDailySpend={0}
          spendingTrend={TREND}
          today="today"
        />,
      );
      expect(screen.getByTestId('today-per-day')).toHaveTextContent('A day to stay on plan: 0 FCFA');
    });

    it('omits the figure when the month has no plan', () => {
      render(
        <TodaySpendingCard
          todaySpending={1000}
          safeDailySpend={null}
          spendingTrend={TREND}
          today="today"
        />,
      );
      expect(screen.queryByTestId('today-per-day')).toBeNull();
      expect(screen.queryByText(/stay on plan/i)).toBeNull();
    });

    it('reads in French', async () => {
      await i18n.changeLanguage('fr');
      render(
        <TodaySpendingCard
          todaySpending={1000}
          safeDailySpend={2000}
          spendingTrend={TREND}
          today="today"
        />,
      );
      expect(screen.getByTestId('today-per-day')).toHaveTextContent(
        'Par jour pour tenir le budget : 2 000 FCFA',
      );
    });
  });

  describe('the 7-day trend', () => {
    it('shows the hero amount and sparkline', () => {
      render(
        <TodaySpendingCard
          todaySpending={5000}
          safeDailySpend={null}
          spendingTrend={TREND}
          today="today"
        />,
      );
      expect(screen.getByTestId('today-spending')).toBeTruthy();
      expect(screen.getByText('5 000 FCFA')).toBeTruthy();
      expect(screen.getByTestId('spending-sparkline')).toBeTruthy();
    });

    it('omits the sparkline when there is no spending', () => {
      render(
        <TodaySpendingCard
          todaySpending={0}
          safeDailySpend={null}
          spendingTrend={[0, 0, 0, 0, 0, 0, 0]}
          today="today"
        />,
      );
      expect(screen.queryByTestId('spending-sparkline')).toBeNull();
    });
  });
});
