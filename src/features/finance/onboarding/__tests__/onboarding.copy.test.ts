import { accounts as enAccounts } from '@/i18n/locales/en/accounts';
import { onboarding as enOnboarding } from '@/i18n/locales/en/onboarding';
import { accounts as frAccounts } from '@/i18n/locales/fr/accounts';
import { onboarding as frOnboarding } from '@/i18n/locales/fr/onboarding';

/** Every string in a catalogue section, however deep. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('set-up copy (VS-87)', () => {
  // The local database is not encrypted and the PIN only locks the screen, so
  // the set-up may say where data stays, never that it is encrypted or secure.
  it('never claims encryption or security it does not have', () => {
    const copy = [enOnboarding, frOnboarding, enAccounts.opening, frAccounts.opening].flatMap(strings);
    for (const text of copy) {
      expect(text).not.toMatch(/encrypt|chiffré|chiffrement|secur|sécuris/i);
    }
  });
});
