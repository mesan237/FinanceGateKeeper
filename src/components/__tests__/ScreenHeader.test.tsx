import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
}));

import { ScreenHeader } from '@/components/ScreenHeader';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ScreenHeader', () => {
  it('renders the back chevron icon and title text', () => {
    render(<ScreenHeader title="My Screen" />);
    expect(screen.getByTestId('screen-header-back')).toBeTruthy();
    expect(screen.getByTestId('screen-header-title')).toBeTruthy();
    expect(screen.getByText('My Screen')).toBeTruthy();
  });

  it('pressing the back chevron calls router.back()', () => {
    render(<ScreenHeader title="My Screen" />);
    fireEvent.press(screen.getByTestId('screen-header-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('renders cancelLabel text instead of the chevron when the prop is provided', () => {
    render(<ScreenHeader title="Log Expense" cancelLabel="Cancel" />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByTestId('screen-header-back')).toBeTruthy();
  });

  it('renders the rightAction node when provided', () => {
    const { Text } = require('react-native');
    render(
      <ScreenHeader
        title="Settings"
        rightAction={<Text testID="right-action-node">Edit</Text>}
      />,
    );
    expect(screen.getByTestId('screen-header-right')).toBeTruthy();
    expect(screen.getByTestId('right-action-node')).toBeTruthy();
  });
});
