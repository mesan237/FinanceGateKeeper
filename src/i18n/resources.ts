import { auth as enAuth } from '@/i18n/locales/en/auth';
import { categories as enCategories } from '@/i18n/locales/en/categories';
import { common as enCommon } from '@/i18n/locales/en/common';
import { dataTransfer as enDataTransfer } from '@/i18n/locales/en/dataTransfer';
import { expenses as enExpenses } from '@/i18n/locales/en/expenses';
import { navigation as enNavigation } from '@/i18n/locales/en/navigation';
import { notifications as enNotifications } from '@/i18n/locales/en/notifications';
import { onboarding as enOnboarding } from '@/i18n/locales/en/onboarding';
import { auth as frAuth } from '@/i18n/locales/fr/auth';
import { categories as frCategories } from '@/i18n/locales/fr/categories';
import { common as frCommon } from '@/i18n/locales/fr/common';
import { dataTransfer as frDataTransfer } from '@/i18n/locales/fr/dataTransfer';
import { expenses as frExpenses } from '@/i18n/locales/fr/expenses';
import { navigation as frNavigation } from '@/i18n/locales/fr/navigation';
import { notifications as frNotifications } from '@/i18n/locales/fr/notifications';
import { onboarding as frOnboarding } from '@/i18n/locales/fr/onboarding';

/**
 * Every translation catalogue, by language then namespace. English is the
 * source of truth for keys (and drives the typed `t()`); each French namespace
 * is typed against its English twin, so the two cannot drift apart.
 */
export const resources = {
  en: {
    common: enCommon,
    categories: enCategories,
    navigation: enNavigation,
    notifications: enNotifications,
    auth: enAuth,
    onboarding: enOnboarding,
    dataTransfer: enDataTransfer,
    expenses: enExpenses,
  },
  fr: {
    common: frCommon,
    categories: frCategories,
    navigation: frNavigation,
    notifications: frNotifications,
    auth: frAuth,
    onboarding: frOnboarding,
    dataTransfer: frDataTransfer,
    expenses: frExpenses,
  },
};

/** The namespace `t()` reads from when none is given. */
export const DEFAULT_NAMESPACE = 'common';
