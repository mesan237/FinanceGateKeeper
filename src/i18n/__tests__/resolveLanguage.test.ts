import { resolveLanguage } from '@/i18n/resolveLanguage';

describe('resolveLanguage', () => {
  it('uses the saved override over the device language', () => {
    expect(resolveLanguage('en', 'fr-CM')).toBe('en');
    expect(resolveLanguage('fr', 'en-US')).toBe('fr');
  });

  it('follows a French device when no override is saved', () => {
    expect(resolveLanguage(null, 'fr-CM')).toBe('fr');
    expect(resolveLanguage(null, 'fr')).toBe('fr');
  });

  it('follows an English device when no override is saved', () => {
    expect(resolveLanguage(null, 'en-GB')).toBe('en');
  });

  it('falls back to English for an unsupported device language', () => {
    expect(resolveLanguage(null, 'de-DE')).toBe('en');
  });

  it('falls back to English when the device language is unknown', () => {
    expect(resolveLanguage(null, null)).toBe('en');
  });
});
