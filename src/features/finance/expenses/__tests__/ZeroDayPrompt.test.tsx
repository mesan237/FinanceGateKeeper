import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { ZeroDayPrompt } from '@/features/finance/expenses/ZeroDayPrompt';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ZeroDayPrompt', () => {
  it('renders the question and both actions when visible', () => {
    render(<ZeroDayPrompt visible onConfirm={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Did you spend nothing today?')).toBeTruthy();
    expect(screen.getByTestId('zero-day-confirm')).toBeTruthy();
    expect(screen.getByTestId('zero-day-log')).toBeTruthy();
  });

  it('calls onConfirm when confirming', () => {
    const onConfirm = jest.fn();
    render(<ZeroDayPrompt visible onConfirm={onConfirm} onClose={jest.fn()} />);
    fireEvent.press(screen.getByTestId('zero-day-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes and navigates to the log form on "Let me log"', () => {
    const onClose = jest.fn();
    render(<ZeroDayPrompt visible onConfirm={jest.fn()} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('zero-day-log'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/expenses/log');
  });
});
