import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { DARK_COLORS, LIGHT_COLORS } from '@/theme/palettes';
import { ThemeProvider, useTheme, useThemeMode } from '@/theme/ThemeProvider';

const mockSetItem = jest.fn();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: (...args: unknown[]) => mockSetItem(...args),
}));

// Control the OS scheme the provider reads.
const mockColorScheme = jest.fn(() => 'light');
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: () => mockColorScheme(),
}));

function Probe() {
  const colors = useTheme();
  const { mode, scheme } = useThemeMode();
  return <Text>{`${mode}|${scheme}|${colors.BACKGROUND}`}</Text>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockColorScheme.mockReturnValue('light');
});

describe('useTheme without a provider', () => {
  it('falls back to the light palette', () => {
    render(<Probe />);
    expect(screen.getByText(`system|light|${LIGHT_COLORS.BACKGROUND}`)).toBeTruthy();
  });
});

describe('ThemeProvider', () => {
  it('follows a dark OS setting in system mode', () => {
    mockColorScheme.mockReturnValue('dark');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText(`system|dark|${DARK_COLORS.BACKGROUND}`)).toBeTruthy();
  });

  it('stays light under a light OS setting', () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText(`system|light|${LIGHT_COLORS.BACKGROUND}`)).toBeTruthy();
  });
});

describe('setMode', () => {
  function AutoDark() {
    const { setMode } = useThemeMode();
    React.useEffect(() => {
      void setMode('dark');
    }, [setMode]);
    return <Probe />;
  }

  it('overrides the OS scheme and persists the choice', async () => {
    render(
      <ThemeProvider>
        <AutoDark />
      </ThemeProvider>,
    );
    await waitFor(() => expect(mockSetItem).toHaveBeenCalledWith('theme-mode', 'dark'));
    await waitFor(() =>
      expect(screen.getByText(`dark|dark|${DARK_COLORS.BACKGROUND}`)).toBeTruthy(),
    );
  });
});
