import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Category } from '@/features/finance/expenses/expenses.types';

const FOOD: Category = { id: 1, name: 'Food', parentId: null, isDefault: true, isHidden: false };
const RESTAURANT: Category = {
  id: 2,
  name: 'Restaurant',
  parentId: 1,
  isDefault: true,
  isHidden: false,
};
const TRANSPORT: Category = {
  id: 3,
  name: 'Transport',
  parentId: null,
  isDefault: true,
  isHidden: false,
};
const FREELANCE: Category = {
  id: 4,
  name: 'Freelance',
  parentId: null,
  isDefault: false,
  isHidden: false,
};

const BASE = [FOOD, RESTAURANT, TRANSPORT, FREELANCE];

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  getAllCategories: jest.fn(),
  createCategory: jest.fn().mockResolvedValue(9),
  renameCategory: jest.fn().mockResolvedValue(undefined),
  deleteCategory: jest.fn().mockResolvedValue(undefined),
  setCategoryHidden: jest.fn().mockResolvedValue(undefined),
  reorderCategories: jest.fn().mockResolvedValue(undefined),
}));

import { CategoryManager } from '@/features/finance/expenses/CategoryManager';
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  renameCategory,
} from '@/features/finance/expenses/expenses.service';

const mockedGetAll = getAllCategories as jest.MockedFunction<typeof getAllCategories>;
const mockedCreate = createCategory as jest.MockedFunction<typeof createCategory>;
const mockedRename = renameCategory as jest.MockedFunction<typeof renameCategory>;
const mockedDelete = deleteCategory as jest.MockedFunction<typeof deleteCategory>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetAll.mockResolvedValue(BASE);
});

describe('CategoryManager', () => {
  it('renders seeded parents with their subcategories', async () => {
    render(<CategoryManager />);
    expect(await screen.findByText('Food')).toBeTruthy();
    expect(screen.getByText('Restaurant')).toBeTruthy();
    expect(screen.getByText('Transport')).toBeTruthy();
  });

  it('adds a category and shows it after the re-fetch', async () => {
    mockedGetAll
      .mockResolvedValueOnce(BASE)
      .mockResolvedValueOnce([
        ...BASE,
        { id: 7, name: 'Investments', parentId: null, isDefault: false, isHidden: false },
      ]);
    render(<CategoryManager />);
    await screen.findByText('Food');

    fireEvent.changeText(screen.getByTestId('new-parent-input'), 'Investments');
    fireEvent.press(screen.getByTestId('add-parent-btn'));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({ name: 'Investments', parentId: null }),
    );
    expect(await screen.findByText('Investments')).toBeTruthy();
  });

  it('renames a category through the inline editor', async () => {
    mockedGetAll
      .mockResolvedValueOnce(BASE)
      .mockResolvedValueOnce([
        { ...FOOD, name: 'Nourriture' },
        RESTAURANT,
        TRANSPORT,
        FREELANCE,
      ]);
    render(<CategoryManager />);
    await screen.findByText('Food');

    fireEvent.press(screen.getByTestId('rename-1'));
    fireEvent.changeText(screen.getByTestId('edit-input-1'), 'Nourriture');
    fireEvent.press(screen.getByTestId('save-1'));

    await waitFor(() => expect(mockedRename).toHaveBeenCalledWith(1, 'Nourriture'));
    expect(await screen.findByText('Nourriture')).toBeTruthy();
  });

  it('asks for a reassignment target before deleting a custom category', async () => {
    render(<CategoryManager />);
    await screen.findByText('Freelance');

    // Default categories offer no Delete action.
    expect(screen.queryByTestId('delete-1')).toBeNull();

    fireEvent.press(screen.getByTestId('delete-4'));
    expect(await screen.findByText('Move expenses from "Freelance" to:')).toBeTruthy();

    fireEvent.press(screen.getByTestId('reassign-1'));
    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(4, 1));
  });
});
