import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { QuickAddTemplate } from '@/features/finance/expenses/expenses.types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const TAXI: QuickAddTemplate = {
  id: 1,
  label: 'Taxi 500',
  amount: 500,
  categoryId: 5,
  subcategoryId: 6,
  sortOrder: 0,
  createdAt: '2026-06-01T00:00:00.000Z',
};
const LUNCH: QuickAddTemplate = {
  id: 2,
  label: 'Lunch 1500',
  amount: 1500,
  categoryId: 1,
  subcategoryId: 3,
  sortOrder: 1,
  createdAt: '2026-06-01T00:00:00.000Z',
};

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getQuickAddTemplates: jest.fn(),
  logFromQuickAddTemplate: jest.fn().mockResolvedValue(10),
  createQuickAddTemplate: jest.fn().mockResolvedValue(3),
  updateQuickAddTemplate: jest.fn().mockResolvedValue(undefined),
  deleteQuickAddTemplate: jest.fn().mockResolvedValue(undefined),
  getAllCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Food', parentId: null, isDefault: true, isHidden: false },
    { id: 3, name: 'Restaurant', parentId: 1, isDefault: true, isHidden: false },
    { id: 5, name: 'Transport', parentId: null, isDefault: true, isHidden: false },
    { id: 6, name: 'Taxi', parentId: 5, isDefault: true, isHidden: false },
  ]),
}));

import { QuickAddScreen } from '@/features/finance/expenses/QuickAddScreen';
import {
  createQuickAddTemplate,
  getQuickAddTemplates,
  logFromQuickAddTemplate,
} from '@/features/finance/expenses/expenses.service';

const mockedGet = getQuickAddTemplates as jest.MockedFunction<typeof getQuickAddTemplates>;
const mockedLog = logFromQuickAddTemplate as jest.MockedFunction<typeof logFromQuickAddTemplate>;
const mockedCreate = createQuickAddTemplate as jest.MockedFunction<typeof createQuickAddTemplate>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue([TAXI, LUNCH]);
});

describe('QuickAddScreen', () => {
  it('renders a tile per template', async () => {
    render(<QuickAddScreen />);
    expect(await screen.findByText('Taxi 500')).toBeTruthy();
    expect(screen.getByText('Lunch 1500')).toBeTruthy();
    expect(screen.getByTestId('quick-add-tile-1')).toBeTruthy();
    expect(screen.getByTestId('quick-add-tile-2')).toBeTruthy();
    expect(screen.getByTestId('quick-add-add-tile')).toBeTruthy();
  });

  it('logs an expense once when a tile is tapped', async () => {
    render(<QuickAddScreen />);
    fireEvent.press(await screen.findByTestId('quick-add-tile-1'));

    await waitFor(() => expect(mockedLog).toHaveBeenCalledTimes(1));
    expect(mockedLog).toHaveBeenCalledWith(1);
  });

  it('opens the create modal from the + tile and saves a new template', async () => {
    render(<QuickAddScreen />);
    fireEvent.press(await screen.findByTestId('quick-add-add-tile'));

    fireEvent.changeText(screen.getByTestId('quick-add-label-input'), 'Snack 200');
    fireEvent.changeText(screen.getByTestId('quick-add-amount-input'), '200');
    fireEvent.press(screen.getByText('Select category'));
    fireEvent.press(await screen.findByText('Food'));
    fireEvent.press(await screen.findByText('Use Food'));
    fireEvent.press(screen.getByTestId('quick-add-save'));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalledTimes(1));
    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Snack 200', amount: 200, categoryId: 1 }),
    );
  });

  it('opens the edit modal pre-filled when a tile is long-pressed', async () => {
    render(<QuickAddScreen />);
    fireEvent(await screen.findByTestId('quick-add-tile-1'), 'longPress');

    expect(screen.getByTestId('quick-add-label-input').props.value).toBe('Taxi 500');
    expect(screen.getByTestId('quick-add-amount-input').props.value).toBe('500');
    expect(screen.getByTestId('quick-add-delete')).toBeTruthy();
  });
});
