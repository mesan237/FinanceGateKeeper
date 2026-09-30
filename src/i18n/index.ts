// i18next resolves plurals through Intl.PluralRules, which Hermes may not ship.
// The polyfill installs itself only when the native one is missing.
import 'intl-pluralrules';

import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_NAMESPACE, resources } from './resources';
import { resolveLanguage, type LanguagePreference } from './resolveLanguage';

/** The device's primary BCP-47 language tag (e.g. `fr-CM`), or `null` if unavailable. */
export function deviceLanguageTag(): string | null {
  try {
    return getLocales()[0]?.languageTag ?? null;
  } catch {
    return null;
  }
}

// Resources are bundled, so initialisation is synchronous: the first render
// already has the right language.
void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(null, deviceLanguageTag()),
  fallbackLng: 'en',
  ns: Object.keys(resources.en),
  defaultNS: DEFAULT_NAMESPACE,
  interpolation: { escapeValue: false },
  initAsync: false,
});

/**
 * Switches the UI to the language implied by a saved preference (`null`
 * follows the device). A no-op when that language is already active.
 */
export async function applyLanguagePreference(preference: LanguagePreference): Promise<void> {
  const next = resolveLanguage(preference, deviceLanguageTag());
  if (i18n.language === next) return;
  await i18n.changeLanguage(next);
}

export { activeLanguage, dateNames } from './dateNames';
export {
  SUPPORTED_LANGUAGES,
  resolveLanguage,
  type AppLanguage,
  type LanguagePreference,
} from './resolveLanguage';
export default i18n;
