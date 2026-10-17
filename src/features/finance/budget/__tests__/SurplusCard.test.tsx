import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { SurplusCard } from '@/features/finance/budget/SurplusCard';
import i18n from '@/i18n';

describe('SurplusCard', () => {
  it('names the income that has no job yet', () => {
    render(<SurplusCard amount={40_000} onAddToBudget={jest.fn()} onLeave={jest.fn()} />);

    expect(screen.getByText('40 000 FCFA received above your budget')).toBeTruthy();
  });

  it('adds the surplus to the budget', () => {
    const onAdd = jest.fn();
    render(<SurplusCard amount={40_000} onAddToBudget={onAdd} onLeave={jest.fn()} />);

    fireEvent.press(screen.getByTestId('surplus-add'));
    expect(onAdd).toHaveBeenCalled();
  });

  it('leaves the surplus unassigned', () => {
    const onLeave = jest.fn();
    render(<SurplusCard amount={40_000} onAddToBudget={jest.fn()} onLeave={onLeave} />);

    fireEvent.press(screen.getByTestId('surplus-leave'));
    expect(onLeave).toHaveBeenCalled();
  });

  it('asks in French', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    render(<SurplusCard amount={40_000} onAddToBudget={jest.fn()} onLeave={jest.fn()} />);

    expect(screen.getByText('Ajouter au budget')).toBeTruthy();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });
});
