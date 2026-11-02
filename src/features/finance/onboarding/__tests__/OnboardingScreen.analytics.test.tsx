import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';

jest.mock('@/services/uiPreferences', () => {
  const store = new Map<string, string>();
  return {
    getPreference: jest.fn(async (key: string) => store.get(key) ?? null),
    setPreference: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
});

import { OnboardingScreen } from '@/features/finance/onboarding/OnboardingScreen';
import {
  resetAnalyticsForTests,
  setAnalyticsProviderFactoryForTests,
} from '@/services/analytics/analytics.service';
import {
  createFakeAnalyticsProvider,
  type FakeAnalyticsProvider,
} from '@/services/analytics/__fixtures__/fakeAnalyticsProvider';

let fake: FakeAnalyticsProvider;

function renderScreen() {
  const onDone = jest.fn();
  render(
    <OnboardingScreen
      onDone={onDone}
      onReminder={jest.fn().mockResolvedValue(true)}
      renderWallets={(next, notice) => (
        <>
          {notice}
          <Pressable testID="fake-wallets-save" onPress={next}>
            <Text>wallet fields</Text>
          </Pressable>
        </>
      )}
      renderFirstEntry={(done) => (
        <Pressable testID="fake-entry-logged" onPress={() => done('logged')}>
          <Text>first entry</Text>
        </Pressable>
      )}
      language="en"
      onLanguage={jest.fn()}
    />,
  );
  return { onDone };
}

beforeEach(() => {
  resetAnalyticsForTests();
  fake = createFakeAnalyticsProvider();
  setAnalyticsProviderFactoryForTests(() => fake);
});

afterEach(() => resetAnalyticsForTests());

it('offers the analytics switch on the wallets step, off by default', async () => {
  renderScreen();
  fireEvent.press(screen.getByTestId('onboarding-next'));
  expect((await screen.findByTestId('onboarding-analytics-switch')).props.accessibilityState).toEqual(
    expect.objectContaining({ checked: false }),
  );
});

it('sends nothing from the set-up when the switch stays off', async () => {
  const { onDone } = renderScreen();

  fireEvent.press(screen.getByTestId('onboarding-next'));
  fireEvent.press(await screen.findByTestId('fake-wallets-save'));
  fireEvent.press(await screen.findByTestId('fake-entry-logged'));
  fireEvent.press(await screen.findByTestId('onboarding-later'));

  expect(onDone).toHaveBeenCalledTimes(1);
  expect(fake.captured).toEqual([]);
});

it('records each step after the opt-in and how the set-up ended', async () => {
  renderScreen();

  fireEvent.press(screen.getByTestId('onboarding-next'));
  await act(async () => {
    fireEvent.press(await screen.findByTestId('onboarding-analytics-switch'));
  });
  await waitFor(() => expect(fake.enabled).toBe(true));
  fireEvent.press(await screen.findByTestId('fake-wallets-save'));
  fireEvent.press(await screen.findByTestId('fake-entry-logged'));
  fireEvent.press(await screen.findByTestId('onboarding-later'));

  expect(fake.captured.map((e) => [e.event, e.properties.entry_point ?? e.properties.workflow_step ?? e.properties.reminder])).toEqual([
    ['analytics_enabled', 'onboarding'],
    ['onboarding_step_completed', 'wallets'],
    ['onboarding_step_completed', 'first_entry'],
    ['onboarding_step_completed', 'reminder'],
    ['onboarding_completed', 'later'],
  ]);
});

it('records where the user skipped the set-up', async () => {
  renderScreen();
  fireEvent.press(screen.getByTestId('onboarding-next'));
  await act(async () => {
    fireEvent.press(await screen.findByTestId('onboarding-analytics-switch'));
  });
  fireEvent.press(await screen.findByTestId('fake-wallets-save'));
  fireEvent.press(await screen.findByTestId('onboarding-skip'));

  expect(fake.captured.at(-1)).toEqual({
    event: 'onboarding_skipped',
    properties: { workflow_step: 'first_entry', app_language: 'en' },
  });
});
