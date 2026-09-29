import type { dataTransfer as en } from '@/i18n/locales/en/dataTransfer';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the Export & Import screen. */
export const dataTransfer: Translation<typeof en> = {
  title: 'Export et import',
  exportTitle: 'Exporter',
  exportSubtitle: 'Enregistrez toutes vos données dans un fichier à sauvegarder ou partager.',
  exportButton: 'Exporter les données',
  exportReady: "Export prêt — choisissez où l'enregistrer.",
  exportFailed: "L'export a échoué.",
  importTitle: 'Importer',
  importSubtitle: 'Restaurez vos données à partir d’un fichier exporté auparavant.',
  importButton: 'Choisir un fichier à importer',
  importDone: 'Données restaurées depuis la sauvegarde.',
  importFailed: "L'import a échoué.",
  readFailed: 'Impossible de lire le fichier sélectionné.',
  confirmTitle: 'Remplacer toutes les données de cet appareil ?',
  confirmBody:
    'Tout ce qui se trouve sur cet appareil sera remplacé par le contenu du fichier sélectionné. Cette action est irréversible.',
  confirmReplace: 'Remplacer les données',
  invalidVersion:
    "Ce fichier de sauvegarde a été créé par une version plus récente ou incompatible de l'application.",
  invalidTable: "Ce fichier de sauvegarde contient des données que l'application ne reconnaît pas.",
  tables: {
    categories: 'Catégories',
    funds: 'Fonds',
    projects: 'Projets',
    accounts: 'Comptes',
    expenses: 'Dépenses',
    income: 'Revenus',
    allocations: 'Budgets mensuels',
    category_budgets: 'Budgets par catégorie',
    fund_transactions: 'Mouvements de fonds',
    project_transactions: 'Contributions aux projets',
    quick_add_templates: 'Modèles d’ajout rapide',
    recurring_expenses: 'Dépenses récurrentes',
    zero_days: 'Jours sans dépense',
    debts: 'Dettes',
    transfers: 'Virements',
  },
};
