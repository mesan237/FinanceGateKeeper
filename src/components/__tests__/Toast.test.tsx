import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';

import { ToastProvider, useToast } from '@/components/Toast';

function Trigger({ message }: { message: string }) {
  const { show } = useToast();
  return (
    <Pressable testID="fire-toast" onPress={() => show(message)}>
      <Text>fire</Text>
    </Pressable>
  );
}

describe('Toast', () => {
  it('shows the message when fired and auto-dismisses after the timeout', () => {
    jest.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger message="Logged 2 500 FCFA" />
      </ToastProvider>,
    );

    fireEvent.press(screen.getByTestId('fire-toast'));
    expect(screen.getByText('Logged 2 500 FCFA')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2100);
    });
    expect(screen.queryByText('Logged 2 500 FCFA')).toBeNull();
    jest.useRealTimers();
  });

  it('a new message replaces the current one and restarts the clock', () => {
    jest.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger message="First" />
      </ToastProvider>,
    );

    fireEvent.press(screen.getByTestId('fire-toast'));
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    fireEvent.press(screen.getByTestId('fire-toast'));
    // 1.5s + 1s is past the original deadline but not the restarted one.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('First')).toBeTruthy();
    jest.useRealTimers();
  });

  it('is a safe no-op when no provider is mounted', () => {
    render(<Trigger message="Orphan" />);

    expect(() => fireEvent.press(screen.getByTestId('fire-toast'))).not.toThrow();
    expect(screen.queryByText('Orphan')).toBeNull();
  });
});
