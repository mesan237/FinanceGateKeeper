import { fireEvent, render, screen } from '@testing-library/react-native';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { AppDrawerContent } from '@/components/AppDrawerContent';
import {
  AttentionProvider,
  useSetAttention,
  type AttentionCounts,
} from '@/components/AttentionProvider';
import { DANGER, WARNING } from '@/constants/colors';
import i18n from '@/i18n';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';

/** Publishes planned-purchase counts, as the planned feature's scheduler does. */
function Publish({ counts, section = 'planned' }: { counts: AttentionCounts; section?: string }) {
  const set = useSetAttention();
  useEffect(() => set(section, counts), [set, counts, section]);
  return null;
}

function renderDrawer(planned?: AttentionCounts, tontines?: AttentionCounts) {
  const navigation = { closeDrawer: jest.fn() };
  const props = { navigation, state: {}, descriptors: {} } as unknown as DrawerContentComponentProps;
  render(
    <AttentionProvider>
      {planned ? <Publish counts={planned} /> : null}
      {tontines ? <Publish counts={tontines} section="tontines" /> : null}
      <AppDrawerContent {...props} />
    </AttentionProvider>,
  );
  return { navigation };
}

describe('AppDrawerContent', () => {
  afterEach(() => jest.clearAllMocks());

  it('groups money apart from the app, in that order (UX-18)', () => {
    renderDrawer();
    const labels = screen.getAllByRole('button').map((row) => row.props.accessibilityLabel);
    expect(labels).toEqual([
      'Wallets',
      'Goals',
      'Debts',
      'Tontines',
      'Planned purchases',
      'Events',
      'Categories',
      'Preferences',
      'Backup & restore',
      'Export & import',
      'Feedback',
    ]);
    expect(screen.getByText('My money')).toBeTruthy();
    expect(screen.getByText('App')).toBeTruthy();
  });

  it('shows no placeholder rows for screens that do not exist yet (UX-18)', () => {
    renderDrawer();
    expect(screen.queryByText('Soon')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Help' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete & Reset' })).toBeNull();
  });

  it('opens the wallets list from "Wallets"', () => {
    const { navigation } = renderDrawer();
    fireEvent.press(screen.getByRole('button', { name: 'Wallets' }));
    expect(mockPush).toHaveBeenCalledWith('/accounts');
    expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
  });

  it('renders "Export & import" as a live, non-disabled row', () => {
    renderDrawer();
    const row = screen.getByRole('button', { name: 'Export & import' });
    expect(row.props.accessibilityState?.disabled).not.toBe(true);
  });

  it('navigates to /data-transfer and closes the drawer when pressed', () => {
    const { navigation } = renderDrawer();
    fireEvent.press(screen.getByRole('button', { name: 'Export & import' }));
    expect(mockPush).toHaveBeenCalledWith('/data-transfer');
    expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
  });

  it('navigates to /debt and closes the drawer when "Debts" is pressed', () => {
    const { navigation } = renderDrawer();
    const row = screen.getByRole('button', { name: 'Debts' });
    expect(row.props.accessibilityState?.disabled).not.toBe(true);
    fireEvent.press(row);
    expect(mockPush).toHaveBeenCalledWith('/debt');
    expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
  });

  it('navigates to /planned and closes the drawer when "Planned purchases" is pressed', () => {
    const { navigation } = renderDrawer();
    fireEvent.press(screen.getByRole('button', { name: 'Planned purchases' }));
    expect(mockPush).toHaveBeenCalledWith('/planned');
    expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
  });

  it('navigates to /goals and closes the drawer when "Goals" is pressed (VS-48)', () => {
    const { navigation } = renderDrawer();
    fireEvent.press(screen.getByRole('button', { name: 'Goals' }));
    expect(mockPush).toHaveBeenCalledWith('/goals');
    expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
  });

  it('navigates to /tontines and closes the drawer when "Tontines" is pressed (VS-51)', () => {
    const { navigation } = renderDrawer();
    fireEvent.press(screen.getByRole('button', { name: 'Tontines' }));
    expect(mockPush).toHaveBeenCalledWith('/tontines');
    expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
  });

  it('navigates to /backup and closes the drawer when "Backup & restore" is pressed', () => {
    const { navigation } = renderDrawer();
    const row = screen.getByRole('button', { name: 'Backup & restore' });
    expect(row.props.accessibilityState?.disabled).not.toBe(true);
    fireEvent.press(row);
    expect(mockPush).toHaveBeenCalledWith('/backup');
    expect(navigation.closeDrawer).toHaveBeenCalledTimes(1);
  });

  it('labels the menu in French when the app is in French', async () => {
    await i18n.changeLanguage('fr');
    renderDrawer();
    expect(screen.getByText('Mon argent')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Portefeuilles' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dettes' })).toBeTruthy();
    expect(screen.queryByText('Bientôt')).toBeNull();
  });

  describe('attention dot', () => {
    it('marks Tontines while contributions are overdue (VS-52)', () => {
      renderDrawer(undefined, { soon: 0, overdue: 2 });
      expect(screen.getByTestId('drawer-dot-tontines')).toBeTruthy();
      expect(screen.queryByTestId('drawer-dot-planned')).toBeNull();
    });

    it('shows no dot while nothing needs attention', () => {
      renderDrawer({ soon: 0, overdue: 0 });
      expect(screen.queryByTestId('drawer-dot-planned')).toBeNull();
    });

    it('marks Planned purchases in amber while items are due soon', () => {
      renderDrawer({ soon: 2, overdue: 0 });
      const dot = screen.getByTestId('drawer-dot-planned');
      expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(WARNING);
      expect(
        screen.getByRole('button', { name: 'Planned purchases' }).props.accessibilityHint,
      ).toBe('2 due soon');
    });

    it('turns the dot red once something is overdue', () => {
      renderDrawer({ soon: 1, overdue: 1 });
      const dot = screen.getByTestId('drawer-dot-planned');
      expect(StyleSheet.flatten(dot.props.style).backgroundColor).toBe(DANGER);
      expect(
        screen.getByRole('button', { name: 'Planned purchases' }).props.accessibilityHint,
      ).toBe('1 overdue, 1 due soon');
    });
  });

});
