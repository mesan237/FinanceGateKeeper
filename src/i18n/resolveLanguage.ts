/** The UI languages the app ships translations for. */
export const SUPPORTED_LANGUAGES = ['en', 'fr'] as const;

/** A UI language with a full translation catalogue. */
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** The saved language choice: an explicit language, or `null` to follow the device. */
export type LanguagePreference = AppLanguage | null;

/** Narrows an arbitrary string to a supported language. */
export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return (SUPPORTED_LANGUAGES as ReadonlyArray<string>).includes(value ?? '');
}

/**
 * Picks the language the UI renders in. A saved override always wins;
 * otherwise the device's language is used when the app supports it
 * (`fr-CM` → `fr`), and English is the fallback for everything else.
 *
 * @param preference The saved Settings choice, or `null` for "System".
 * @param deviceTag The device's BCP-47 language tag (e.g. `fr-CM`), if known.
 */
export function resolveLanguage(
  preference: LanguagePreference,
  deviceTag: string | null,
): AppLanguage {
  if (preference) return preference;
  const base = deviceTag?.split(/[-_]/)[0]?.toLowerCase();
  return isAppLanguage(base) ? base : 'en';
}
