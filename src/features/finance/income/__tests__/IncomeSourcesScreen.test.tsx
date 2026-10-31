import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/features/finance/income/incomeSources.service', () => ({
  getIncomeSources: jest.fn(),
  createIncomeSource: jest.fn(),
  renameIncomeSource: jest.fn(),
  setIncomeSourceHidden: jest.fn(),
}));

import { IncomeSourcesScreen } from '@/features/finance/income/IncomeSourcesScreen';
import type { IncomeSource } from '@/features/finance/income/income.types';
import * as service from '@/features/finance/income/incomeSources.service';

const mocked = service as jest.Mocked<typeof service>;

const SOURCES: IncomeSource[] = [
  { id: 1, key: 'salary', name: 'Salary', parentId: null, isHidden: false, sortOrder: 0 },
  { id: 3, key: 'business', name: 'Business', parentId: null, isHidden: false, sortOrder: 1 },
  { id: 5, key: 'other', name: 'Other', parentId: null, isHidden: true, sortOrder: 2 },
  { id: 6, key: 'ecommerce', name: 'E-commerce', parentId: 3, isHidden: false, sortOrder: 0 },
  { id: 7, key: null, name: 'Taxi', parentId: 3, isHidden: false, sortOrder: 1 },
];

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getIncomeSources.mockResolvedValue(SOURCES);
});

async function renderScreen() {
  render(<IncomeSourcesScreen />);
  await screen.findByText('Salary');
}

describe('IncomeSourcesScreen', () => {
  it('lists every source, subsources under theirs, hidden ones marked', async () => {
    await renderScreen();

    for (const name of ['Business / side business', 'E-commerce', 'Taxi', 'Other']) {
      expect(screen.getByText(name)).toBeTruthy();
    }
    expect(screen.getByTestId('income-source-hidden-5')).toBeTruthy();
    expect(screen.queryByTestId('income-source-hidden-1')).toBeNull();
  });

  it('offers rename only on sources the user made', async () => {
    await renderScreen();

    expect(screen.getByLabelText('Rename Taxi')).toBeTruthy();
    expect(screen.queryByLabelText('Rename Salary')).toBeNull();
    expect(screen.queryByLabelText('Rename E-commerce')).toBeNull();
  });

  it('renames a source', async () => {
    await renderScreen();

    fireEvent.press(screen.getByLabelText('Rename Taxi'));
    fireEvent.changeText(screen.getByLabelText('Name'), 'Taxi line');
    fireEvent.press(screen.getByTestId('income-source-save'));

    await waitFor(() => expect(mocked.renameIncomeSource).toHaveBeenCalledWith(7, 'Taxi line'));
  });

  it('hides a source and shows a hidden one again', async () => {
    await renderScreen();

    fireEvent.press(screen.getByLabelText('Hide Salary'));
    await waitFor(() => expect(mocked.setIncomeSourceHidden).toHaveBeenCalledWith(1, true));

    fireEvent.press(screen.getByLabelText('Show Other'));
    await waitFor(() => expect(mocked.setIncomeSourceHidden).toHaveBeenCalledWith(5, false));
  });

  it('adds a top-level source and a subsource', async () => {
    mocked.createIncomeSource.mockResolvedValue(8);
    await renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Add a source' }));
    fireEvent.changeText(screen.getByLabelText('Name'), 'Pension');
    fireEvent.press(screen.getByTestId('income-source-save'));
    await waitFor(() => expect(mocked.createIncomeSource).toHaveBeenCalledWith('Pension', null));

    fireEvent.press(screen.getByLabelText('Add under Business / side business'));
    fireEvent.changeText(screen.getByLabelText('Name'), 'Shop');
    fireEvent.press(screen.getByTestId('income-source-save'));
    await waitFor(() => expect(mocked.createIncomeSource).toHaveBeenCalledWith('Shop', 3));
  });

  it('does not offer a subsource under a subsource', async () => {
    await renderScreen();

    expect(screen.queryByLabelText('Add under E-commerce')).toBeNull();
  });
});
