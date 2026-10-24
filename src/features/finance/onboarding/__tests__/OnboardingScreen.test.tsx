import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';

import { OnboardingScreen } from '@/features/finance/onboarding/OnboardingScreen';
import i18n from '@/i18n';

/** Stands in for the accounts slice's wallet step, which the routing layer injects. */
function FakeWallets({ next }: { next: () => void }) {
  return (
    <Pressable testID="fake-wallets-save" onPress={next}>
      <Text>wallet fields</Text>
    </Pressable>
  );
}

function renderScreen() {
  const onDone = jest.fn();
  const onReminder = jest.fn().mockResolvedValue(true);
  render(
    <OnboardingScreen
      onDone={onDone}
      onReminder={onReminder}
      renderWallets={(next) => <FakeWallets next={next} />}
    />,
  );
  return { onDone, onReminder };
}

describe('OnboardingScreen — first-run set-up (UX-08)', () => {
  it('opens on what the app does and the five steps of the path', () => {
    renderScreen();

    expect(screen.getByText('Know where every franc goes')).toBeTruthy();
    for (const step of ['Observe', 'See', 'Plan', 'Optimize', 'Grow']) {
      expect(screen.getByText(step)).toBeTruthy();
    }
    expect(screen.getByText('Step 1 of 3')).toBeTruthy();
  });

  it('asks what the wallets hold, through the injected step', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('onboarding-next'));

    expect(screen.getByText('What do your wallets hold today?')).toBeTruthy();
    expect(screen.getByText('wallet fields')).toBeTruthy();
  });

  it('moves to the reminder once the wallets are saved', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));

    fireEvent.press(screen.getByTestId('fake-wallets-save'));

    expect(screen.getByText('When can you log each day?')).toBeTruthy();
  });

  it('lets the wallets wait: "Not now" moves on without them', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));

    fireEvent.press(screen.getByTestId('onboarding-later'));

    expect(screen.getByText('When can you log each day?')).toBeTruthy();
  });

  it('sets the reminder at 21:00 by default, then finishes', async () => {
    const { onDone, onReminder } = renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('onboarding-later'));

    fireEvent.press(screen.getByTestId('onboarding-remind'));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onReminder).toHaveBeenCalledWith('21:00');
  });

  it('finishes without a reminder on "No reminders"', () => {
    const { onDone, onReminder } = renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('onboarding-later'));

    fireEvent.press(screen.getByTestId('onboarding-later'));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onReminder).not.toHaveBeenCalled();
  });

  it('can skip the whole set-up from any step', () => {
    const { onDone } = renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));

    fireEvent.press(screen.getByTestId('onboarding-skip'));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('still finishes when the reminder cannot be saved', async () => {
    const onDone = jest.fn();
    render(
      <OnboardingScreen
        onDone={onDone}
        onReminder={jest.fn().mockRejectedValue(new Error('denied'))}
        renderWallets={(next) => <FakeWallets next={next} />}
      />,
    );
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('onboarding-later'));

    fireEvent.press(screen.getByTestId('onboarding-remind'));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('reads in French', async () => {
    await act(() => i18n.changeLanguage('fr'));
    try {
      renderScreen();
      expect(screen.getByText('Sachez où va chaque franc')).toBeTruthy();
      expect(screen.getByText('Étape 1 sur 3')).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage('en'));
    }
  });
});
