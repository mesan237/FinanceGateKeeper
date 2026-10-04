import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React, { useEffect } from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import {
  AttentionProvider,
  useSetAttention,
  type AttentionCounts,
} from '@/components/AttentionProvider';
import { PlannedDueCard } from '@/features/finance/dashboard/PlannedDueCard';
import i18n from '@/i18n';

function Publish({ counts }: { counts: AttentionCounts }) {
  const set = useSetAttention();
  useEffect(() => set('planned', counts), [set, counts]);
  return null;
}

function renderCard(counts: AttentionCounts) {
  render(
    <AttentionProvider>
      <Publish counts={counts} />
      <PlannedDueCard />
    </AttentionProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('PlannedDueCard', () => {
  it('stays hidden while no planned purchase needs attention', () => {
    renderCard({ soon: 0, overdue: 0 });
    expect(screen.queryByTestId('planned-due-card')).toBeNull();
  });

  it('says how many planned purchases are due soon', () => {
    renderCard({ soon: 2, overdue: 0 });
    expect(screen.getByText('2 planned purchases due soon')).toBeTruthy();
  });

  it('leads with the overdue ones', () => {
    renderCard({ soon: 1, overdue: 1 });
    expect(screen.getByText('1 planned purchase overdue')).toBeTruthy();
    expect(screen.getByText('1 planned purchase due soon')).toBeTruthy();
  });

  it('opens the planned purchases when tapped', () => {
    renderCard({ soon: 1, overdue: 0 });
    fireEvent.press(screen.getByTestId('planned-due-card'));
    expect(mockPush).toHaveBeenCalledWith('/planned');
  });

  it('reads in French', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    renderCard({ soon: 2, overdue: 1 });
    expect(screen.getByText('1 achat prévu en retard')).toBeTruthy();
    expect(screen.getByText('2 achats prévus à venir')).toBeTruthy();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
