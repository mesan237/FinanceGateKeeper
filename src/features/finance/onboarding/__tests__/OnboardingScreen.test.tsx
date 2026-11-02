import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';

import { OnboardingScreen, type FirstEntryOutcome } from '@/features/finance/onboarding/OnboardingScreen';
import i18n, { type AppLanguage } from '@/i18n';

/** Stands in for the accounts slice's wallet step, which the routing layer injects. */
function FakeWallets({ next, notice }: { next: () => void; notice: React.ReactNode }) {
  return (
    <>
      <Text>wallet fields</Text>
      {notice}
      <Pressable testID="fake-wallets-save" onPress={next}>
        <Text>save wallets</Text>
      </Pressable>
    </>
  );
}

/** Stands in for the expenses slice's first entry, one button per way out. */
function FakeFirstEntry({ done }: { done: (outcome: FirstEntryOutcome) => void }) {
  return (
    <>
      <Text>first entry fields</Text>
      <Pressable testID="fake-entry-logged" onPress={() => done('logged')}>
        <Text>logged</Text>
      </Pressable>
      <Pressable testID="fake-entry-no-spend" onPress={() => done('noSpend')}>
        <Text>no spend</Text>
      </Pressable>
      <Pressable testID="fake-entry-later" onPress={() => done('later')}>
        <Text>later</Text>
      </Pressable>
    </>
  );
}

function renderScreen(onReminder = jest.fn().mockResolvedValue(true)) {
  const onDone = jest.fn();
  render(
    <OnboardingScreen
      onDone={onDone}
      onReminder={onReminder}
      renderWallets={(next, notice) => <FakeWallets next={next} notice={notice} />}
      renderFirstEntry={(done) => <FakeFirstEntry done={done} />}
      language="en"
      onLanguage={jest.fn()}
    />,
  );
  return { onDone, onReminder };
}

/** Walks to the reminder through a logged first entry. */
function goToReminder(entry = 'fake-entry-logged') {
  fireEvent.press(screen.getByTestId('onboarding-next'));
  fireEvent.press(screen.getByTestId('fake-wallets-save'));
  fireEvent.press(screen.getByTestId(entry));
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
      renderFirstEntry={(done) => <FakeFirstEntry done={done} />}
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
    fireEvent.press(screen.getByTestId('fake-entry-logged'));
    expect(screen.getByTestId('onboarding-language-en')).toBeTruthy();
  });

  it('switches the screen to French and keeps the step and the balances typed', async () => {
    render(<LanguageHarness />);
    fireEvent.press(screen.getByTestId('onboarding-next'));
    fireEvent.changeText(screen.getByTestId('fake-wallet-input'), '15000');

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-language-fr'));
    });

    expect(screen.getByText('Que contiennent vos portefeuilles aujourd’hui ?')).toBeTruthy();
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(screen.getByTestId('fake-wallet-input').props.value).toBe('15000');
    expect(screen.getByTestId('onboarding-language-fr').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it('keeps the reminder time chosen when the language changes', async () => {
    render(<LanguageHarness />);
    goToReminder();
    fireEvent(screen.getByTestId('onboarding-reminder-time'), 'press');
    fireEvent(screen.getByTestId('time-picker'), 'onChange', { type: 'set' }, new Date(2026, 0, 1, 7, 15));
    expect(screen.getByText('07:15')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByTestId('onboarding-language-fr'));
    });

    expect(screen.getByText('C’est noté. Votre premier jour compte.')).toBeTruthy();
    expect(screen.getByText('07:15')).toBeTruthy();
  });
});

describe('OnboardingScreen — problem to action (VS-92)', () => {
  it('opens on the problem, with an example month that has a gap in it', () => {
    renderScreen();

    expect(screen.getByText('You know what you earn. But where does the money go?')).toBeTruthy();
    expect(screen.getByText('1 / 3')).toBeTruthy();
    expect(screen.getByTestId('onboarding-example')).toBeTruthy();
    expect(screen.getByText('Not noted?')).toBeTruthy();
  });

  it('asks what the wallets hold, through the injected step', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('onboarding-next'));

    expect(screen.getByText('What do your wallets hold today?')).toBeTruthy();
    expect(screen.getByText('2 / 3')).toBeTruthy();
    expect(screen.getByText('wallet fields')).toBeTruthy();
  });

  it('puts the privacy line and the analytics switch under the wallet fields', () => {
    renderScreen();
    expect(screen.queryByTestId('onboarding-analytics')).toBeNull();

    fireEvent.press(screen.getByTestId('onboarding-next'));

    expect(screen.getByText(/Your data stays on this phone/)).toBeTruthy();
    const tree = JSON.stringify(screen.toJSON());
    expect(tree.indexOf('wallet fields')).toBeLessThan(tree.indexOf('Your data stays on this phone'));
    expect(screen.getByTestId('onboarding-analytics')).toBeTruthy();
  });

  it('asks for a first expense once the wallets are saved', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));

    fireEvent.press(screen.getByTestId('fake-wallets-save'));

    expect(screen.getByText('Note your first expense')).toBeTruthy();
    expect(screen.getByText('3 / 3')).toBeTruthy();
    expect(screen.getByText('first entry fields')).toBeTruthy();
  });

  it.each(['fake-entry-logged', 'fake-entry-no-spend'])('celebrates the first day after %s', (entry) => {
    renderScreen();
    goToReminder(entry);

    expect(screen.getByTestId('onboarding-success')).toBeTruthy();
    expect(screen.getByText('Noted. Your first day counts.')).toBeTruthy();
    expect(screen.getByText(/On other days, the app says nothing/)).toBeTruthy();
    expect(screen.queryByText('3 / 3')).toBeNull();
    expect(screen.queryByTestId('onboarding-skip')).toBeNull();
  });

  it('claims nothing was noted when the first entry waits', () => {
    renderScreen();
    goToReminder('fake-entry-later');

    expect(screen.queryByTestId('onboarding-success')).toBeNull();
    expect(screen.queryByText('Noted. Your first day counts.')).toBeNull();
    expect(screen.getByText('Want a gentle reminder?')).toBeTruthy();
  });

  it('sets the reminder at 21:00 by default, then finishes', async () => {
    const { onDone, onReminder } = renderScreen();
    goToReminder();

    fireEvent.press(screen.getByTestId('onboarding-remind'));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(onReminder).toHaveBeenCalledWith('21:00');
  });

  it('finishes without a reminder on "No reminder"', () => {
    const { onDone, onReminder } = renderScreen();
    goToReminder();

    fireEvent.press(screen.getByTestId('onboarding-later'));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onReminder).not.toHaveBeenCalled();
  });

  it('can skip the whole set-up from the numbered steps', () => {
    const { onDone } = renderScreen();
    fireEvent.press(screen.getByTestId('onboarding-next'));

    fireEvent.press(screen.getByTestId('onboarding-skip'));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('says so and waits when notifications are refused, instead of finishing as if reminders were on', async () => {
    const { onDone } = renderScreen(jest.fn().mockResolvedValue(false));
    goToReminder();

    fireEvent.press(screen.getByTestId('onboarding-remind'));

    expect(await screen.findByTestId('onboarding-reminder-blocked')).toBeTruthy();
    expect(screen.getByText(/Notifications are blocked for the app/)).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.queryByTestId('onboarding-remind')).toBeNull();

    fireEvent.press(screen.getByTestId('onboarding-continue'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('still finishes when the reminder cannot be saved', async () => {
    const { onDone } = renderScreen(jest.fn().mockRejectedValue(new Error('denied')));
    goToReminder();

    fireEvent.press(screen.getByTestId('onboarding-remind'));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('reads in French', async () => {
    await act(() => i18n.changeLanguage('fr'));
    try {
      renderScreen();
      expect(screen.getByText('Vous savez ce que vous gagnez. Mais où part l’argent ?')).toBeTruthy();
      expect(screen.getByText('Passer')).toBeTruthy();
      expect(screen.getByText('Commencer')).toBeTruthy();
      expect(screen.getByText('EXEMPLE')).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage('en'));
    }
  });
});
