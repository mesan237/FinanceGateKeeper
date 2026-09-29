import type { common as en } from '@/i18n/locales/en/common';
import type { Translation } from '@/i18n/translation.types';

/** French words shared across every screen. */
export const common: Translation<typeof en> = {
  actions: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    done: 'Terminé',
    confirm: 'Confirmer',
    close: 'Fermer',
    back: 'Retour',
    retry: 'Réessayer',
  },
  // Each language is named in itself, so it stays findable whatever the UI is in.
  languages: {
    en: 'English',
    fr: 'Français',
  },
  incomeSources: {
    salary: 'Salaire',
    freelance: 'Freelance',
    ecommerce: 'E-commerce',
  },
};
