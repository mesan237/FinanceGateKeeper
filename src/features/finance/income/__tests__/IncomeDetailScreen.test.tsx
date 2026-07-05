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

  it('Allocate now pushes the allocation route with amount, month, and income id', async () => {
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    fireEvent.press(screen.getByTestId('allocate-now'));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/income/allocate',
        params: { amount: '350000', month: '2026-06', incomeId: '9' },
      }),
    );
  });

  it('Allocate now persists in-form edits before navigating', async () => {
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Amount in FCFA'), '400000');
    fireEvent.press(screen.getByTestId('allocate-now'));

    // The edited amount must be saved to the row before the allocation flow
    // deposits from it — otherwise deposits and the stored row desynchronise.
    await waitFor(() =>
      expect(mockUpdateIncome).toHaveBeenCalledWith(9, expect.objectContaining({ amount: 400000 })),
    );
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/income/allocate',
        params: { amount: '400000', month: '2026-06', incomeId: '9' },
      }),
    );
  });

  it('Allocate now does not navigate when the pre-allocation save fails', async () => {
    mockUpdateIncome.mockRejectedValue(new Error('Income amount must be a positive integer (FCFA).'));
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByDisplayValue('350 000')).toBeTruthy());
    fireEvent.press(screen.getByTestId('allocate-now'));

    expect(
      await screen.findByText('Income amount must be a positive integer (FCFA).'),
    ).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe('IncomeDetailScreen — allocated income', () => {
  beforeEach(() => {
    mockGetIncomeById.mockResolvedValue(ALLOCATED_INCOME);
  });

  it('renders amount/date read-only and hides Delete and Allocate-now', async () => {
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByTestId('allocated-lock')).toBeTruthy());
    expect(screen.queryByLabelText('Amount in FCFA')).toBeNull();
    expect(screen.queryByTestId('income-detail-date')).toBeNull();
    expect(screen.queryByTestId('delete-income')).toBeNull();
    expect(screen.queryByTestId('allocate-now')).toBeNull();
    expect(screen.getByText('350 000 FCFA')).toBeTruthy();
  });

  it('still saves a metadata patch (same amount and date)', async () => {
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByTestId('allocated-lock')).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText('Note'), 'recategorised');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockUpdateIncome).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ amount: 350000, date: '2026-06-10', note: 'recategorised' }),
      ),
    );
  });

  it('surfaces a service rejection inline without navigating', async () => {
    mockUpdateIncome.mockRejectedValue(
      new Error('Allocated income cannot change amount or date.'),
    );
    render(<IncomeDetailScreen incomeId={9} />);

    await waitFor(() => expect(screen.getByTestId('allocated-lock')).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Allocated income cannot change amount or date.'),
    ).toBeTruthy();
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
