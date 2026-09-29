import type { auth as en } from '@/i18n/locales/en/auth';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the auth slice. */
export const auth: Translation<typeof en> = {
  settings: {
    title: 'Paramètres',
    loading: 'Chargement des paramètres…',
    profileTitle: 'Profil',
    profileSubtitle: 'Votre nom, votre avatar et votre compte.',
    appearanceTitle: 'Apparence',
    appearanceSubtitle: "Choisissez un thème clair ou sombre, ou suivez l'appareil.",
    themeSystem: 'Système',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    languageTitle: 'Langue',
    languageSubtitle: "Suivez l'appareil, ou choisissez la langue de l'application.",
    languageSystem: 'Système',
    reminderTitle: 'Rappel quotidien',
    reminderSubtitle: 'Nous vous rappellerons de noter les dépenses du jour.',
    reminderTimeLabel: 'Heure du rappel',
    reminderSave: 'Enregistrer le rappel',
    reminderSaveError: "Impossible d'enregistrer le rappel.",
    notificationsTitle: 'Notifications',
    notificationsSubtitle: 'Rappels quotidiens et alertes de budget.',
  },
};
