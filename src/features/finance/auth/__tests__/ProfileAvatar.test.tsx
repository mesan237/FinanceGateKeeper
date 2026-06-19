import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ProfileAvatar, initialsFor } from '@/features/finance/auth/ProfileAvatar';

describe('initialsFor', () => {
  it('takes the first letter of up to two words', () => {
    expect(initialsFor('Abdiel')).toBe('A');
    expect(initialsFor('Abdiel Kouam')).toBe('AK');
    expect(initialsFor('Abdiel Mesan Kouam')).toBe('AM');
  });

  it('falls back to "?" for an empty name', () => {
    expect(initialsFor(null)).toBe('?');
    expect(initialsFor('   ')).toBe('?');
  });
});

describe('ProfileAvatar', () => {
  it('renders the emoji when one is set', () => {
    render(<ProfileAvatar displayName="Abdiel" avatarColor="#E57373" avatarEmoji="😎" />);
    expect(screen.getByText('😎')).toBeTruthy();
    expect(screen.queryByText('A')).toBeNull();
  });

  it('renders initials when no emoji is set', () => {
    render(<ProfileAvatar displayName="Abdiel Kouam" avatarColor="#E57373" avatarEmoji={null} />);
    expect(screen.getByText('AK')).toBeTruthy();
  });
});
