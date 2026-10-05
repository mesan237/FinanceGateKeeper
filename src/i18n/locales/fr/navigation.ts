import type { navigation as en } from '@/i18n/locales/en/navigation';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the app shell. */
export const navigation: Translation<typeof en> = {
  tabs: {
    // "Tableau de bord" is too long for an 11px tab label.
    dashboard: 'Accueil',
    transactions: 'Transactions',
    budget: 'Budget',
    reports: 'Rapports',
  },
  openMenu: 'Ouvrir le menu',
  attention: {
    overdue: '{{count}} en retard',
    soon: '{{count}} à venir',
  },
  drawer: {
    preferences: 'Préférences',
    management: 'Gestion',
    accounts: 'Comptes',
    categories: 'Catégories',
    debts: 'Dettes',
    planned: 'Achats prévus',
    exportImport: 'Export et import',
    backupRestore: 'Sauvegarde et restauration',
    deleteReset: 'Supprimer et réinitialiser',
    application: 'Application',
    help: 'Aide',
    feedback: 'Avis',
    soon: 'Bientôt',
  },
};
