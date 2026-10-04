import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { AppState, Text } from 'react-native';

const mockReconcile = jest.fn();
jest.mock('@/features/finance/planned/planned.reminders', () => ({
  reconcilePlannedReminders: () => mockReconcile(),
}));

import { AttentionProvider, useAttention } from '@/components/AttentionProvider';
import { PlannedReminderScheduler } from '@/features/finance/planned/PlannedReminderScheduler';
import { notifyPlannedChange } from '@/features/finance/planned/planned.events';

function Reader() {
  const { soon, overdue } = useAttention('planned');
  return <Text testID="counts">{`${soon}/${overdue}`}</Text>;
}

function renderScheduler() {
  render(
    <AttentionProvider>
      <PlannedReminderScheduler>
        <Reader />
      </PlannedReminderScheduler>
    </AttentionProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReconcile.mockResolvedValue({ dueSoon: 2, overdue: 1 });
});

describe('PlannedReminderScheduler', () => {
  it('plans the reminders on open and publishes what needs attention', async () => {
    renderScheduler();
    await waitFor(() => expect(screen.getByTestId('counts')).toHaveTextContent('2/1'));
    expect(mockReconcile).toHaveBeenCalledTimes(1);
  });

  it('re-plans after a list or item changes', async () => {
    renderScheduler();
    await waitFor(() => expect(mockReconcile).toHaveBeenCalledTimes(1));
    mockReconcile.mockResolvedValue({ dueSoon: 0, overdue: 0 });

    await act(async () => {
      notifyPlannedChange();
    });

    await waitFor(() => expect(screen.getByTestId('counts')).toHaveTextContent('0/0'));
  });

  it('re-plans when the app comes back to the foreground, since the day may have changed', async () => {
    const listeners: Array<(state: string) => void> = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    renderScheduler();
    await waitFor(() => expect(mockReconcile).toHaveBeenCalledTimes(1));

    await act(async () => {
      listeners.forEach((listener) => listener('active'));
    });

    expect(mockReconcile).toHaveBeenCalledTimes(2);
  });

  it('keeps the app running when planning fails', async () => {
    mockReconcile.mockRejectedValue(new Error('no permission'));
    renderScheduler();
    await waitFor(() => expect(mockReconcile).toHaveBeenCalled());
    expect(screen.getByTestId('counts')).toHaveTextContent('0/0');
  });
});
