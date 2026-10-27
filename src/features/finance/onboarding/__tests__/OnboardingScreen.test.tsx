import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';

import { OnboardingScreen } from '@/features/finance/onboarding/OnboardingScreen';
import i18n, { type AppLanguage } from '@/i18n';

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
      language="en"
      onLanguage={jest.fn()}
    />,
  );
  return { onDone, onReminder };
}

/** A wallet step that keeps what was typed, like the real one, to prove a language switch keeps it. */
function TypedWallets({ next }: { next: () => void }) {
  const [text, setText] = useState('');
  return (
    <>
      <TextInput testID="fake-wallet-input" value={text} onChangeText={setText} />
      <Pressable testID="fake-wallets-save" onPress={next}>
        <Text>wallet fields</Text>
      </Pressable>
    </>
  );
}

/** Plays the routing layer: saves the language and re-renders the set-up in it. */
function LanguageHarness() {
  const [language, setLanguage] = useState<AppLanguage>('en');
  return (
    <OnboardingScreen
      onDone={jest.fn()}
      onReminder={jest.fn().mockResolvedValue(true)}
      renderWallets={(next) => <TypedWallets next={next} />}
      language={language}
      onLanguage={async (next) => {
        await i18n.changeLanguage(next);
        setLanguage(next);
      }}
    />
  );
}

describe('OnboardingScreen — language (VS-86)', () => {
  it('offers FR | EN on every step', () => {
    renderScreen();
    expect(screen.getByTestId('onboarding-language-fr')).toBeTruthy();
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(screen.getByTestId('onboarding-language-en')).toBeTruthy();
    fireEvent.press(screen.getByTestId('fake-wallets-save'));
    expect(screen.getByTestId('onboarding-language-fr')).toBeTruthy();
  });

  it('switches the screen to French and keeps the step and the balances typed', async () => {
    render(<LanguageHarness />);
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.changeText(screen.getByTestId('fake-wallet-input'), '15000');

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-language-fr'));
    });

    expect(screen.getByText('Que contiennent vos portefeuilles aujourd’hui ?')).toBeTruthy();
    expect(screen.getByText('Étape 2 sur 3')).toBeTruthy();
    expect(screen.getByTestId('fake-wallet-input').props.value).toBe('15000');
    expect(screen.getByTestId('onboarding-language-fr').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it('keeps the reminder time chosen when the language changes', async () => {
    render(<LanguageHarness />);
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('fake-wallets-save'));
    fireEvent(screen.getByTestId('onboarding-reminder-time'), 'press');
    fireEvent(screen.getByTestId('time-picker'), 'onChange', { type: 'set' }, new Date(2026, 0, 1, 7, 15));
    expect(screen.getByText('07:15')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-language-fr'));
    });

    expect(screen.getByText('Étape 3 sur 3')).toBeTruthy();
    expect(screen.getByText('07:15')).toBeTruthy();
  });
});

describe('OnboardingScreen — first-run set-up (UX-08)', () => {
  it('opens on a budget built on real spending and three stages: now, after, then (VS-87)', () => {
    renderScreen();

    expect(screen.getByText('A budget built on what you really spend')).toBeTruthy();
    for (const when of ['Now', 'After 3 complete months', 'Then']) {
      expect(screen.getByText(when)).toBeTruthy();
    }
    for (const stage of ['Observe', 'Plan', 'Optimize']) {
      expect(screen.getByText(stage)).toBeTruthy();
    }
    // The path's other two steps wait for My path.
    expect(screen.queryByText('See')).toBeNull();
    expect(screen.queryByText('Grow')).toBeNull();
    expect(screen.getByText('Step 1 of 3')).toBeTruthy();
  });

  it('says when a month counts, and that a budget can be made right away', () => {
    renderScreen();
    expect(screen.getByText(/A month counts once 8 days in 10 are logged/)).toBeTruthy();
    expect(screen.getByText(/You can make one now from your estimates/)).toBeTruthy();
  });

  it('marks only the stage the user starts with as current', () => {
    renderScreen();
    expect(screen.getByTestId('onboarding-stage-now').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByTestId('onboarding-stage-after').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
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

  it('says where the data stays before any amount is asked for', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));

    expect(screen.getByText(/Your data stays on this phone/)).toBeTruthy();
    // Rendered before the wallet fields, so it is read first.
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('Your data stays on this phone')).toBeLessThan(tree.indexOf('wallet fields'));
  });

  it('leaves the wallet step its own buttons: no second "Not now" in the footer', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));
    expect(screen.queryByTestId('onboarding-later')).toBeNull();
  });

  it('sets the reminder at 21:00 by default, then finishes', async () => {
    const { onDone, onReminder } = renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('fake-wallets-save'));

    fireEvent.press(screen.getByTestId('onboarding-remind'));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onReminder).toHaveBeenCalledWith('21:00');
  });

  it('finishes without a reminder on "No reminders"', () => {
    const { onDone, onReminder } = renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('fake-wallets-save'));

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
        language="en"
        onLanguage={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.press(screen.getByTestId('fake-wallets-save'));

    fireEvent.press(screen.getByTestId('onboarding-remind'));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('reads in French', async () => {
    await act(() => i18n.changeLanguage('fr'));
    try {
      renderScreen();
      expect(screen.getByText('Un budget fondé sur vos vraies dépenses')).toBeTruthy();
      expect(screen.getByText('Maintenant')).toBeTruthy();
      expect(screen.getByText('Après 3 mois complets')).toBeTruthy();
      expect(screen.getByText('Étape 1 sur 3')).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage('en'));
    }
  });
});
