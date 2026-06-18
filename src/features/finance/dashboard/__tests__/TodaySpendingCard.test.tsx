import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { TodaySpendingCard } from '@/features/finance/dashboard/TodaySpendingCard';

const TREND = [0, 1000, 0, 2500, 0, 0, 5000];

describe('TodaySpendingCard', () => {
  describe('control mode', () => {
    it("shows today's spending and date", () => {
      render(
        <TodaySpendingCard
          includeBudgetData
          todaySpending={5000}
          dailyPace={2000}
          spendingTrend={TREND}
          today="Thursday, 18 June 2026"
        />,
      );
      expect(screen.getByTestId('today-spending')).toBeTruthy();
      expect(screen.getByText('5 000 FCFA')).toBeTruthy();
      expect(screen.getByText('Thursday, 18 June 2026')).toBeTruthy();
    });

    it('flags spending over the daily pace', () => {
      render(
        <TodaySpendingCard
          includeBudgetData
          todaySpending={5000}
          dailyPace={2000}
          spendingTrend={TREND}
          today="today"
        />,
      );
      expect(screen.getByText(/over your daily pace of 2 000 FCFA/i)).toBeTruthy();
    });

    it('reassures when spending is within the daily pace', () => {
      render(
        <TodaySpendingCard
          includeBudgetData
          todaySpending={1000}
          dailyPace={2000}
          spendingTrend={TREND}
          today="today"
        />,
      );
      expect(screen.getByText(/within your daily pace of 2 000 FCFA/i)).toBeTruthy();
    });

    it('omits the pace caption when no pace is available', () => {
      render(
        <TodaySpendingCard
          includeBudgetData
          todaySpending={1000}
          dailyPace={null}
          spendingTrend={TREND}
          today="today"
        />,
      );
      expect(screen.queryByText(/daily pace/i)).toBeNull();
    });
  });

  describe('learning mode', () => {
    it('shows the hero amount and sparkline', () => {
      render(
        <TodaySpendingCard
          includeBudgetData={false}
          todaySpending={5000}
          dailyPace={null}
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
          includeBudgetData={false}
          todaySpending={0}
          dailyPace={null}
          spendingTrend={[0, 0, 0, 0, 0, 0, 0]}
          today="today"
        />,
      );
      expect(screen.queryByTestId('spending-sparkline')).toBeNull();
    });
  });
});
