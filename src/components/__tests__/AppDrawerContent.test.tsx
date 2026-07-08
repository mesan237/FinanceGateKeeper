import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { AppDrawerContent } from '@/components/AppDrawerContent';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';

function renderDrawer() {
  const navigation = { closeDrawer: jest.fn() };
  const props = { navigation, state: {}, descriptors: {} } as unknown as DrawerContentComponentProps;
  render(<AppDrawerContent {...props} />);
  return { navigation };
}

describe('AppDrawerContent', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders "Export & Import" as a live, non-disabled row', () => {
    renderDrawer();
    const row = screen.getByRole('button', { name: 'Export & Import' });
    expect(row.props.accessibilityState?.disabled).not.toBe(true);
    expect(screen.queryAllByText('Soon').length).toBeGreaterThan(0); // other soon rows still exist
  });

  it('navigates to /data-transfer and closes the drawer when pressed', () => {
    const { navigation } = renderDrawer();
    fireEvent.press(screen.getByRole('button', { name: 'Export & Import' }));
    expect(mockPush).toHaveBeenCalledWith('/data-transfer');
    expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
  });

  it('leaves "Backup & Restore" disabled', () => {
    renderDrawer();
    const row = screen.getByRole('button', { name: 'Backup & Restore' });
    expect(row.props.accessibilityState?.disabled).toBe(true);
  });
});
