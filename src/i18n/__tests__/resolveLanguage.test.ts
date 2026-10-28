import { deviceLanguage, resolveLanguage } from '@/i18n/resolveLanguage';

describe('resolveLanguage', () => {
  it('uses the saved choice', () => {
    expect(resolveLanguage('en')).toBe('en');
    expect(resolveLanguage('fr')).toBe('fr');
  });

  it('is French when nothing is saved, whatever the device (VS-86)', () => {
    expect(resolveLanguage(null)).toBe('fr');
  });
});

describe('deviceLanguage', () => {
  it('follows a French or English device', () => {
    expect(deviceLanguage('fr-CM')).toBe('fr');
    expect(deviceLanguage('fr')).toBe('fr');
    expect(deviceLanguage('en-GB')).toBe('en');
  });

  it('falls back to English for an unsupported or unknown device language', () => {
    expect(deviceLanguage('de-DE')).toBe('en');
    expect(deviceLanguage(null)).toBe('en');
  });
});
