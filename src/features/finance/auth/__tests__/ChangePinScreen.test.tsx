import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

jest.mock('@/features/finance/auth/auth.service', () => ({
  verifyPin: jest.fn(),
  changePin: jest.fn().mockResolvedValue(undefined),
}));

import { ChangePinScreen } from '@/features/finance/auth/ChangePinScreen';
import { changePin, verifyPin } from '@/features/finance/auth/auth.service';

const mockedVerify = verifyPin as jest.MockedFunction<typeof verifyPin>;
const mockedChange = changePin as jest.MockedFunction<typeof changePin>;

function enter(pin: string) {
  for (const digit of pin) {
    fireEvent.press(screen.getByTestId(`pin-key-${digit}`));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ChangePinScreen', () => {
  it('rejects a wrong current PIN', async () => {
    mockedVerify.mockResolvedValue(false);
    render(<ChangePinScreen />);
    enter('0000');
    expect(await screen.findByTestId('change-pin-error')).toBeTruthy();
    expect(screen.getByText('Enter current PIN')).toBeTruthy();
  });

  it('walks current → new → confirm and commits the change', async () => {
    mockedVerify.mockResolvedValue(true);
    render(<ChangePinScreen />);

    enter('1111'); // current
    expect(await screen.findByText('Choose a new PIN')).toBeTruthy();
    enter('2222'); // new
    expect(await screen.findByText('Confirm new PIN')).toBeTruthy();
    enter('2222'); // confirm

    await waitFor(() => expect(mockedChange).toHaveBeenCalledWith('1111', '2222'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('shows an error and returns to the new step when confirmation does not match', async () => {
    mockedVerify.mockResolvedValue(true);
    render(<ChangePinScreen />);

    enter('1111'); // current
    await screen.findByText('Choose a new PIN');
    enter('2222'); // new
    await screen.findByText('Confirm new PIN');
    enter('3333'); // mismatching confirm

    expect(await screen.findByTestId('change-pin-error')).toBeTruthy();
    expect(screen.getByText('Choose a new PIN')).toBeTruthy();
    expect(mockedChange).not.toHaveBeenCalled();
  });
});
