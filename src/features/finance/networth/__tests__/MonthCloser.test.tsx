import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

const mockClose = jest.fn();
jest.mock('@/features/finance/networth/networth.snapshots', () => ({
  closeMonths: () => mockClose(),
}));

import { MonthCloser } from '@/features/finance/networth/MonthCloser';

beforeEach(() => {
  jest.clearAllMocks();
  mockClose.mockResolvedValue(undefined);
});

describe('MonthCloser (VS-53)', () => {
  it('snapshots the closed months when the app opens, and renders its children', async () => {
    render(
      <MonthCloser>
        <Text>app</Text>
      </MonthCloser>,
    );

    expect(screen.getByText('app')).toBeTruthy();
    await waitFor(() => expect(mockClose).toHaveBeenCalledTimes(1));
  });

  it('never blocks the app when snapshotting fails', async () => {
    mockClose.mockRejectedValue(new Error('disk full'));
    render(
      <MonthCloser>
        <Text>app</Text>
      </MonthCloser>,
    );

    await waitFor(() => expect(mockClose).toHaveBeenCalled());
    expect(screen.getByText('app')).toBeTruthy();
  });
});
