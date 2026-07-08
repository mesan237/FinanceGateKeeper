import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

const mockShow = jest.fn();
jest.mock('@/components/Toast', () => {
  const actual = jest.requireActual('@/components/Toast');
  return { ...actual, useToast: () => ({ show: mockShow }) };
});

const mockExportRun = jest.fn();
const mockPick = jest.fn();
const mockConfirm = jest.fn();

jest.mock('../dataTransfer.hooks', () => ({
  useExportData: () => ({ run: mockExportRun, isLoading: false, error: null }),
  useImportData: () => ({ pick: mockPick, confirm: mockConfirm, isLoading: false, error: null }),
}));

import { DataTransferScreen } from '@/features/finance/dataTransfer/DataTransferScreen';

const PAYLOAD = {
  version: 1 as const,
  exportedAt: '2026-07-08T12:00:00.000Z',
  tables: { categories: [{ id: 1 }], expenses: [{ id: 1 }, { id: 2 }] },
};
const PICKED = { payload: PAYLOAD, summary: { categories: 1, expenses: 2 } };

beforeEach(() => jest.clearAllMocks());

describe('DataTransferScreen', () => {
  it('renders Export and Import sections', () => {
    render(<DataTransferScreen />);
    expect(screen.getByTestId('data-transfer-export')).toBeTruthy();
    expect(screen.getByTestId('data-transfer-import-pick')).toBeTruthy();
  });

  it('pressing Export calls the export hook and shows a success toast', async () => {
    mockExportRun.mockResolvedValue(true);
    render(<DataTransferScreen />);

    fireEvent.press(screen.getByTestId('data-transfer-export'));

    await waitFor(() => expect(mockExportRun).toHaveBeenCalledTimes(1));
    expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('Export'));
  });

  it('picking a file shows a confirm modal with per-table row counts', async () => {
    mockPick.mockResolvedValue(PICKED);
    render(<DataTransferScreen />);

    fireEvent.press(screen.getByTestId('data-transfer-import-pick'));

    await waitFor(() => expect(screen.getByTestId('data-transfer-import-confirm')).toBeTruthy());
    expect(screen.getByText(/categories/i)).toBeTruthy();
    expect(screen.getByText(/expenses/i)).toBeTruthy();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('cancelling the picked file does nothing', async () => {
    mockPick.mockResolvedValue(null);
    render(<DataTransferScreen />);

    fireEvent.press(screen.getByTestId('data-transfer-import-pick'));

    await waitFor(() => expect(mockPick).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('data-transfer-import-confirm')).toBeNull();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('confirming the destructive warning applies the import and shows a toast', async () => {
    mockPick.mockResolvedValue(PICKED);
    mockConfirm.mockResolvedValue({ categories: 1, expenses: 2 });
    render(<DataTransferScreen />);

    fireEvent.press(screen.getByTestId('data-transfer-import-pick'));
    await waitFor(() => expect(screen.getByTestId('data-transfer-import-confirm')).toBeTruthy());

    fireEvent.press(screen.getByTestId('data-transfer-import-confirm'));

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith(PAYLOAD));
    expect(mockShow).toHaveBeenCalledWith(expect.stringContaining('restored'));
    expect(screen.queryByTestId('data-transfer-import-confirm')).toBeNull();
  });

  it('dismissing the confirm modal makes no service call', async () => {
    mockPick.mockResolvedValue(PICKED);
    render(<DataTransferScreen />);

    fireEvent.press(screen.getByTestId('data-transfer-import-pick'));
    await waitFor(() => expect(screen.getByTestId('data-transfer-import-cancel')).toBeTruthy());

    fireEvent.press(screen.getByTestId('data-transfer-import-cancel'));

    expect(screen.queryByTestId('data-transfer-import-confirm')).toBeNull();
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
