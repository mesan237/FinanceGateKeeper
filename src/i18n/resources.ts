import { categories as enCategories } from '@/i18n/locales/en/categories';
import { common as enCommon } from '@/i18n/locales/en/common';
import { categories as frCategories } from '@/i18n/locales/fr/categories';
import { common as frCommon } from '@/i18n/locales/fr/common';

/**
 * Every translation catalogue, by language then namespace. English is the
 * source of truth for keys (and drives the typed `t()`); each French namespace
 * is typed against its English twin, so the two cannot drift apart.
 */
export const resources = {
  en: {
    common: enCommon,
    categories: enCategories,
  },
  fr: {
    common: frCommon,
    categories: frCategories,
  },
};

/** The namespace `t()` reads from when none is given. */
export const DEFAULT_NAMESPACE = 'common';
