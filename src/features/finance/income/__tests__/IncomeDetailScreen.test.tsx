import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

const mockGetIncomeById = jest.fn();
const mockUpdateIncome = jest.fn();
const mockDeleteIncome = jest.fn();

jest.mock('@/features/finance/income/income.service', () => ({
  getIncomeById: (...args: unknown[]) => mockGetIncomeById(...args),
  updateIncome: (...args: unknown[]) => mockUpdateIncome(...args),
  deleteIncome: (...args: unknown[]) => mockDeleteIncome(...args),
}));

import { IncomeDetailScreen } from '@/features/finance/income/IncomeDetailScreen';
import type { Income } from '@/features/finance/income/income.types';

const PENDING_INCOME: Income = {
  id: 9,
  amount: 350000,
  source: 'salary',
  note: 'June pay',
  date: '2026-06-10',
  accountId: null,
  allocationStatus: 'pending',
  createdAt: '2026-06-10T08:00:00.000Z',
};

const ALLOCATED_INCOME: Income = { ...PENDING_INCOME, allocationStatus: 'allocated' };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetIncomeById.mockResolvedValue(PENDING_INCOME);
  mockUpdateIncome.mockResolvedValue(undefined);
  mockDeleteIncome.mockResolvedValue(undefined);
});

describe('IncomeDetailScreen — pending income', () => {
  it('renders pre-filled amount, note, date, and source', async () => {
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    expect(screen.getByDisplayValue('June pay')).toBeTruthy();
    expect(screen.getByTestId('income-detail-date')).toBeTruthy();
  });

  it('uses a back chevron, not a "Cancel" label — it is a drill-down (VS-26 M3)', async () => {
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    expect(screen.getByLabelText('Back')).toBeTruthy();
    expect(screen.queryByText('Cancel')).toBeNull();
  });

  it('Save submits the patch and navigates back', async () => {
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '400000');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockUpdateIncome).toHaveBeenCalledTimes(1));
    expect(mockUpdateIncome).toHaveBeenCalledWith(9, expect.objectContaining({ amount: 400000 }));
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('Delete asks for confirmation, then deletes and navigates back', async () => {
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    fireEvent.press(screen.getByTestId('delete-income'));
    expect(screen.getByText('Delete income?')).toBeTruthy();
    expect(mockDeleteIncome).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(mockDeleteIncome).toHaveBeenCalledWith(9));
    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  });

  it('cancelling the delete confirmation deletes nothing', async () => {
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    fireEvent.press(screen.getByTestId('delete-income'));
    fireEvent.press(screen.getByTestId('delete-modal-cancel'));

    expect(mockDeleteIncome).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

});

describe('IncomeDetailScreen — a row logged earlier', () => {
  beforeEach(() => {
    mockGetIncomeById.mockResolvedValue(ALLOCATED_INCOME);
  });

  it('keeps amount and date editable, and still offers Delete (VS-34)', async () => {
    // These used to render read-only behind an 'allocated-lock' block, because
    // allocation had moved money into funds and projects. Nothing does now.
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    expect(screen.getByTestId('income-detail-date')).toBeTruthy();
    expect(screen.getByTestId('delete-income')).toBeTruthy();
    expect(screen.queryByTestId('allocated-lock')).toBeNull();
    expect(screen.queryByTestId('allocate-now')).toBeNull();
  });

  it('saves an amount change', async () => {
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '420000');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockUpdateIncome).toHaveBeenCalledWith(9, expect.objectContaining({ amount: 420000 })),
    );
  });

  it('surfaces a service rejection inline without navigating', async () => {
    mockUpdateIncome.mockRejectedValueOnce(new Error('Database is locked.'));
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Database is locked.')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('IncomeDetailScreen — missing row', () => {
  it('renders a not-found state for an unknown id', async () => {
    mockGetIncomeById.mockResolvedValue(null);
    render(<IncomeDetailScreen incomeId={404} />);

    expect(await screen.findByText('Income not found.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
});
