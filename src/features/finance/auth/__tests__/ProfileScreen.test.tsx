import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

jest.mock('@/features/finance/auth/auth.profile', () => ({
  getProfile: jest.fn(),
  setProfile: jest.fn().mockResolvedValue(undefined),
}));

const mockCloud = {
  userEmail: null as string | null,
  signedIn: false,
  status: 'idle' as const,
  lastSyncedAt: null,
  error: null,
  signIn: jest.fn().mockResolvedValue(true),
  signUp: jest.fn().mockResolvedValue(true),
  signOut: jest.fn().mockResolvedValue(undefined),
  syncNow: jest.fn().mockResolvedValue(undefined),
};
jest.mock('@/hooks/useCloudSync', () => ({ useCloudSync: () => mockCloud }));

import { ProfileScreen } from '@/features/finance/auth/ProfileScreen';
import { getProfile, setProfile } from '@/features/finance/auth/auth.profile';

const mockedGet = getProfile as jest.MockedFunction<typeof getProfile>;
const mockedSet = setProfile as jest.MockedFunction<typeof setProfile>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedGet.mockResolvedValue({ displayName: 'Abdiel', avatarColor: '#E57373', avatarEmoji: null });
});

describe('ProfileScreen', () => {
  it('seeds the name field and avatar from the loaded profile', async () => {
    render(<ProfileScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('profile-name-input').props.value).toBe('Abdiel'),
    );
    expect(screen.getByTestId('profile-avatar')).toBeTruthy();
  });

  it('saves the edited name and avatar', async () => {
    render(<ProfileScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('profile-name-input').props.value).toBe('Abdiel'),
    );

    fireEvent.changeText(screen.getByTestId('profile-name-input'), 'Mesan');
    fireEvent.press(screen.getByTestId('profile-emoji-🚀'));
    fireEvent.press(screen.getByTestId('profile-save'));

    await waitFor(() =>
      expect(mockedSet).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'Mesan', avatarEmoji: '🚀' }),
      ),
    );
  });

  it('navigates to the Change PIN screen', async () => {
    render(<ProfileScreen />);
    await screen.findByTestId('profile-change-pin');
    fireEvent.press(screen.getByTestId('profile-change-pin'));
    expect(mockRouter.push).toHaveBeenCalledWith('/profile/change-pin');
  });

  it('renders the cloud-account controls', async () => {
    render(<ProfileScreen />);
    expect(await screen.findByTestId('profile-sign-in')).toBeTruthy();
  });
});
