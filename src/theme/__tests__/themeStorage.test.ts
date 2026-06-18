import * as SecureStore from 'expo-secure-store';

import { getThemeMode, setThemeMode } from '@/theme/themeStorage';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

const mockGet = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockSet = SecureStore.setItemAsync as jest.MockedFunction<typeof SecureStore.setItemAsync>;

beforeEach(() => jest.clearAllMocks());

describe('themeStorage', () => {
  it('returns the persisted mode when valid', async () => {
    mockGet.mockResolvedValue('dark');
    expect(await getThemeMode()).toBe('dark');
  });

  it('defaults to system when nothing is stored', async () => {
    mockGet.mockResolvedValue(null);
    expect(await getThemeMode()).toBe('system');
  });

  it('defaults to system on an unrecognised value', async () => {
    mockGet.mockResolvedValue('neon');
    expect(await getThemeMode()).toBe('system');
  });

  it('defaults to system when the read throws', async () => {
    mockGet.mockRejectedValue(new Error('keystore unavailable'));
    expect(await getThemeMode()).toBe('system');
  });

  it('persists a mode under the theme-mode key', async () => {
    mockSet.mockResolvedValue();
    await setThemeMode('light');
    expect(mockSet).toHaveBeenCalledWith('theme-mode', 'light');
  });
});
