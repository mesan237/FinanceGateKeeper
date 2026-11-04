import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/services/uiPreferences', () => ({
  getPreference: jest.fn(),
  setPreference: jest.fn().mockResolvedValue(undefined),
}));

import { FirstTimeHint } from '@/components/FirstTimeHint';
import i18n from '@/i18n';
import * as prefs from '@/services/uiPreferences';

const mocked = prefs as jest.Mocked<typeof prefs>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getPreference.mockResolvedValue(null);
  mocked.setPreference.mockResolvedValue(undefined);
});

describe('FirstTimeHint (VS-94)', () => {
  it('shows its message the first time', async () => {
    render(<FirstTimeHint id="path" message="Tap a step to open it." testID="hint" />);

    expect(await screen.findByText('Tap a step to open it.')).toBeTruthy();
    expect(mocked.getPreference).toHaveBeenCalledWith('hint.path');
  });

  it('stays hidden once dismissed', async () => {
    mocked.getPreference.mockResolvedValue('dismissed');
    render(<FirstTimeHint id="path" message="Tap a step to open it." testID="hint" />);

    await waitFor(() => expect(mocked.getPreference).toHaveBeenCalled());
    expect(screen.queryByTestId('hint')).toBeNull();
  });

  it('shows nothing before the preference is read, so it never flashes', () => {
    mocked.getPreference.mockReturnValue(new Promise(() => {}));
    render(<FirstTimeHint id="path" message="Tap a step to open it." testID="hint" />);

    expect(screen.queryByTestId('hint')).toBeNull();
  });

  it('stays hidden when the preference cannot be read', async () => {
    mocked.getPreference.mockRejectedValue(new Error('disk'));
    render(<FirstTimeHint id="path" message="Tap a step to open it." testID="hint" />);

    await waitFor(() => expect(mocked.getPreference).toHaveBeenCalled());
    expect(screen.queryByTestId('hint')).toBeNull();
  });

  it('goes away on "Got it" and remembers it on this phone', async () => {
    render(<FirstTimeHint id="path" message="Tap a step to open it." testID="hint" />);

    fireEvent.press(await screen.findByTestId('hint-dismiss'));

    expect(screen.queryByTestId('hint')).toBeNull();
    expect(mocked.setPreference).toHaveBeenCalledWith('hint.path', 'dismissed');
  });

  it('reads in French', async () => {
    await act(() => i18n.changeLanguage('fr'));
    try {
      render(<FirstTimeHint id="path" message="Touchez une étape." testID="hint" />);
      expect(await screen.findByText('Compris')).toBeTruthy();
    } finally {
      await act(() => i18n.changeLanguage('en'));
    }
  });
});
