import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import React, { useEffect } from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const { useEffect: useReactEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (callback: () => void) => useReactEffect(callback, [callback]),
  };
});

jest.mock('@/features/finance/budget/budget.committed', () => ({
  getDueItems: jest.fn(),
}));

import { JourneyStageProvider, useSetJourneyStage } from '@/components/JourneyStageProvider';
import * as committed from '@/features/finance/budget/budget.committed';
import type { DueItem } from '@/features/finance/budget/budget.types';
import { NextForYouCard } from '@/features/finance/dashboard/NextForYouCard';
import i18n from '@/i18n';
import type { JourneyStepKey } from '@/types/journey';

const mocked = committed as jest.Mocked<typeof committed>;

const ITEMS: DueItem[] = [
  { kind: 'tontine', label: 'Bureau', amount: 10_000, date: '2026-10-12' },
  { kind: 'recurring', label: 'Rent', amount: 50_000, date: '2026-10-28' },
  { kind: 'planned', label: 'School shoes', amount: 15_000, date: '2026-10-30' },
];

/** Publishes `stage` the way the journey slice does once it has read the path. */
function AtStep({ stage, children }: { stage: JourneyStepKey; children: React.ReactNode }) {
  const publish = useSetJourneyStage();
  useEffect(() => publish(stage), [publish, stage]);
  return <>{children}</>;
}

function renderCard(stage?: JourneyStepKey) {
  render(
    <JourneyStageProvider>
      {stage ? (
        <AtStep stage={stage}>
          <NextForYouCard todayISO="2026-10-26" />
        </AtStep>
      ) : (
        <NextForYouCard todayISO="2026-10-26" />
      )}
    </JourneyStageProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getDueItems.mockResolvedValue(ITEMS);
});

describe('NextForYouCard', () => {
  it('leads with the most urgent payment, saying it is overdue', async () => {
    renderCard();

    const first = await screen.findByTestId('next-first');
    expect(first).toHaveTextContent(/Bureau/);
    expect(first).toHaveTextContent(/10 000 FCFA/);
    expect(first).toHaveTextContent(/Overdue since 12 Oct/);
    expect(mocked.getDueItems).toHaveBeenCalledWith('2026-10');
  });

  it('says when a payment is due today or later', async () => {
    mocked.getDueItems.mockResolvedValue([{ kind: 'recurring', label: 'Rent', amount: 50_000, date: '2026-10-26' }]);
    renderCard();

    expect(await screen.findByTestId('next-first')).toHaveTextContent(/Due today/);
  });

  it('opens every payment due before month end from "+ 2 more"', async () => {
    renderCard();

    fireEvent.press(await screen.findByTestId('next-more'));

    const sheet = within(screen.getByTestId('next-sheet'));
    expect(sheet.getByText('Due before month end')).toBeTruthy();
    expect(sheet.getByTestId('next-item-0')).toHaveTextContent(/Bureau/);
    expect(sheet.getByTestId('next-item-1')).toHaveTextContent(/Rent.*Due 28 Oct.*50 000 FCFA/);
    expect(sheet.getByTestId('next-item-2')).toHaveTextContent(/School shoes/);
  });

  it('offers no "more" with a single payment', async () => {
    mocked.getDueItems.mockResolvedValue([ITEMS[0]]);
    renderCard();

    await screen.findByTestId('next-first');
    expect(screen.queryByTestId('next-more')).toBeNull();
  });

  describe('with nothing due, the step leads (04 §8.4)', () => {
    beforeEach(() => mocked.getDueItems.mockResolvedValue([]));

    it.each([
      ['observe', 'Keep logging every day: your first months are being recorded', '/path'],
      ['see', 'See what your first months really cost', '/path'],
      ['optimize', 'See where you have room to spend less', '/path'],
      ['grow', 'Put what you free up into a goal', '/goals'],
    ] as const)('on %s, prompts "%s"', async (stage, text, route) => {
      renderCard(stage);

      const prompt = await screen.findByTestId('next-prompt');
      expect(prompt).toHaveTextContent(text);
      fireEvent.press(prompt);
      expect(mockPush).toHaveBeenCalledWith(route);
    });

    it('on plan, opens next month\'s planner', async () => {
      renderCard('plan');

      fireEvent.press(await screen.findByTestId('next-prompt'));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/budget/plan', params: { month: '2026-11' } });
    });

    it('shows nothing while the step is unknown', async () => {
      renderCard();

      await act(async () => {});
      expect(screen.queryByTestId('next-for-you')).toBeNull();
    });
  });

  it('reads in French', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    renderCard();

    expect(await screen.findByText('À faire')).toBeTruthy();
    expect(screen.getByTestId('next-first')).toHaveTextContent(/En retard depuis le 12 oct\./);
    expect(screen.getByTestId('next-more')).toHaveTextContent('+ 2 autres');
  });
});
