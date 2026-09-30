import { accounts as enAccounts } from '@/i18n/locales/en/accounts';
import { auth as enAuth } from '@/i18n/locales/en/auth';
import { budget as enBudget } from '@/i18n/locales/en/budget';
import { categories as enCategories } from '@/i18n/locales/en/categories';
import { common as enCommon } from '@/i18n/locales/en/common';
import { debt as enDebt } from '@/i18n/locales/en/debt';
import { dashboard as enDashboard } from '@/i18n/locales/en/dashboard';
import { dataTransfer as enDataTransfer } from '@/i18n/locales/en/dataTransfer';
import { expenses as enExpenses } from '@/i18n/locales/en/expenses';
import { income as enIncome } from '@/i18n/locales/en/income';
import { navigation as enNavigation } from '@/i18n/locales/en/navigation';
import { notifications as enNotifications } from '@/i18n/locales/en/notifications';
import { onboarding as enOnboarding } from '@/i18n/locales/en/onboarding';
import { planned as enPlanned } from '@/i18n/locales/en/planned';
import { reports as enReports } from '@/i18n/locales/en/reports';
import { accounts as frAccounts } from '@/i18n/locales/fr/accounts';
import { auth as frAuth } from '@/i18n/locales/fr/auth';
import { budget as frBudget } from '@/i18n/locales/fr/budget';
import { categories as frCategories } from '@/i18n/locales/fr/categories';
import { common as frCommon } from '@/i18n/locales/fr/common';
import { debt as frDebt } from '@/i18n/locales/fr/debt';
import { dashboard as frDashboard } from '@/i18n/locales/fr/dashboard';
import { dataTransfer as frDataTransfer } from '@/i18n/locales/fr/dataTransfer';
import { expenses as frExpenses } from '@/i18n/locales/fr/expenses';
import { income as frIncome } from '@/i18n/locales/fr/income';
import { navigation as frNavigation } from '@/i18n/locales/fr/navigation';
import { notifications as frNotifications } from '@/i18n/locales/fr/notifications';
import { onboarding as frOnboarding } from '@/i18n/locales/fr/onboarding';
import { planned as frPlanned } from '@/i18n/locales/fr/planned';
import { reports as frReports } from '@/i18n/locales/fr/reports';

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
    income: enIncome,
    accounts: enAccounts,
    debt: enDebt,
    budget: enBudget,
    dashboard: enDashboard,
    reports: enReports,
    planned: enPlanned,
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
    income: frIncome,
    accounts: frAccounts,
    debt: frDebt,
    budget: frBudget,
    dashboard: frDashboard,
    reports: frReports,
    planned: frPlanned,
  },
};

/** The namespace `t()` reads from when none is given. */
export const DEFAULT_NAMESPACE = 'common';
