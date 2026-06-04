import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

jest.mock('@/features/finance/expenses/expenses.service', () => ({
  runRecurringAutoLog: jest.fn(),
}));

import { RecurringAutoLogger } from '@/features/finance/expenses/RecurringAutoLogger';
import { runRecurringAutoLog } from '@/features/finance/expenses/expenses.service';

const mockedRun = runRecurringAutoLog as jest.MockedFunction<typeof runRecurringAutoLog>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RecurringAutoLogger', () => {
  it('runs the auto-log once on mount and renders children', async () => {
    mockedRun.mockResolvedValue({ loggedCount: 0 });
    render(
      <RecurringAutoLogger>
        <Text>child content</Text>
      </RecurringAutoLogger>,
    );

    expect(screen.getByText('child content')).toBeTruthy();
    await waitFor(() => expect(mockedRun).toHaveBeenCalledTimes(1));
  });

  it('still renders children when the auto-log throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockedRun.mockRejectedValue(new Error('db locked'));

    render(
      <RecurringAutoLogger>
        <Text>child content</Text>
      </RecurringAutoLogger>,
    );

    expect(screen.getByText('child content')).toBeTruthy();
    await waitFor(() => expect(mockedRun).toHaveBeenCalledTimes(1));
    errorSpy.mockRestore();
  });
});
