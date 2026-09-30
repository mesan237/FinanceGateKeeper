import { render } from '@testing-library/react-native';
import React from 'react';

const mockStack = jest.fn((_props: unknown) => null);
jest.mock('expo-router', () => ({
  Stack: (props: unknown) => mockStack(props),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, bottom: 48, left: 0, right: 0 }),
}));

import { PushedScreensStack } from '@/components/PushedScreensStack';

type ScreenOptions = (args: { route: { name: string } }) => {
  headerShown: boolean;
  contentStyle?: { paddingBottom: number };
};

function screenOptions(): ScreenOptions {
  render(<PushedScreensStack />);
  const props = mockStack.mock.calls[0][0] as { screenOptions: ScreenOptions };
  return props.screenOptions;
}

beforeEach(() => mockStack.mockClear());

describe('PushedScreensStack', () => {
  it('hides the native header on every screen', () => {
    const options = screenOptions();
    expect(options({ route: { name: 'planned/index' } }).headerShown).toBe(false);
    expect(options({ route: { name: '(drawer)' } }).headerShown).toBe(false);
  });

  // Edge-to-edge Android draws under the system navigation bar, so a button
  // pinned to the bottom of a pushed screen was hidden behind it.
  it.each(['planned/index', 'planned/[id]', 'debt/create', 'budget/plan', 'settings/index'])(
    'keeps %s clear of the system navigation bar',
    (name) => {
      const options = screenOptions();
      expect(options({ route: { name } }).contentStyle).toEqual({ paddingBottom: 48 });
    },
  );

  it('leaves the tab screens alone, because the tab bar already accounts for the inset', () => {
    const options = screenOptions();
    expect(options({ route: { name: '(drawer)' } }).contentStyle).toBeUndefined();
  });
});
