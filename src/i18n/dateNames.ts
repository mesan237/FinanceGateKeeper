import i18n from 'i18next';

import { isAppLanguage, type AppLanguage } from './resolveLanguage';

/** Calendar words for one language, indexed like `Date#getUTCDay`/`getUTCMonth`. */
export interface DateNames {
  today: string;
  yesterday: string;
  daysShort: ReadonlyArray<string>;
  monthsShort: ReadonlyArray<string>;
  monthsLong: ReadonlyArray<string>;
}

// Fixed tables rather than Intl.DateTimeFormat: the output must not depend on
// which Intl data the device's Hermes build ships with.
const DATE_NAMES: Record<AppLanguage, DateNames> = {
  en: {
    today: 'Today',
    yesterday: 'Yesterday',
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    monthsLong: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
  },
  fr: {
    today: "Aujourd'hui",
    yesterday: 'Hier',
    daysShort: ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'],
    monthsShort: [
      'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
      'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
    ],
    monthsLong: [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
    ],
  },
};

/** The language the UI is currently rendering in (English until i18n starts). */
export function activeLanguage(): AppLanguage {
  return isAppLanguage(i18n.language) ? i18n.language : 'en';
}

/**
 * Returns the calendar words for a language.
 *
 * @param lang Language to use; defaults to the active UI language.
 */
export function dateNames(lang: AppLanguage = activeLanguage()): DateNames {
  return DATE_NAMES[lang];
}
