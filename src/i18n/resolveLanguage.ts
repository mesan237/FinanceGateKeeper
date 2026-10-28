/** The UI languages the app ships translations for. */
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;

/** A UI language with a full translation catalogue. */
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** The saved language choice, or `null` when none has been made yet. */
export type LanguagePreference = AppLanguage | null;

/** The language of a fresh install, whatever the device is set to (VS-86). */
export const DEFAULT_LANGUAGE: AppLanguage = 'fr';

/** Narrows an arbitrary string to a supported language. */
export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return (SUPPORTED_LANGUAGES as ReadonlyArray<string>).includes(value ?? '');
}

/**
 * Picks the language the UI renders in: the saved choice, or French when none
 * has been made (VS-86). The device language no longer decides — most users
 * read French, whatever their phone is set to.
 */
export function resolveLanguage(preference: LanguagePreference): AppLanguage {
  return preference ?? DEFAULT_LANGUAGE;
}

/**
 * The language the app showed before VS-86 for a device tag: the device's own
 * when supported (`fr-CM` → `fr`), English otherwise. Used once, to keep an
 * existing install in the language it already showed.
 *
 * @param deviceTag The device's BCP-47 language tag (e.g. `fr-CM`), if known.
 */
export function deviceLanguage(deviceTag: string | null): AppLanguage {
  const base = deviceTag?.split(/[-_]/)[0]?.toLowerCase();
  return isAppLanguage(base) ? base : 'en';
}
