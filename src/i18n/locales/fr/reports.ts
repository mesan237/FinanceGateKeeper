import type { reports as en } from '@/i18n/locales/en/reports';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the reports slice. */
export const reports: Translation<typeof en> = {
  loading: 'Chargement…',
  uncategorised: 'Sans catégorie',
  previousPeriod: 'Période précédente',
  nextPeriod: 'Période suivante',
  noData: 'Aucune donnée pour cette période.',
  totalCaps: 'TOTAL',
  monthly: {
    incomeCaps: 'REVENUS',
    expensesCaps: 'DÉPENSES',
    performance: 'Suivi des dépenses',
    planned: 'Prévu',
    actual: 'Dépenses réelles',
    remaining: 'Budget restant',
    byCategory: 'Dépenses par catégorie',
    pctOfTotal: '{{percent}} % du total',
    debt: 'Dettes',
    lentOut: 'Prêté',
    owed: 'Emprunté',
    viewWeekly: 'Voir le rapport hebdomadaire →',
  },
  comparison: {
    title: 'Dépenses par rapport au mois précédent',
    empty: 'Aucune donnée de comparaison pour le mois dernier.',
    new: 'Nouveau',
  },
  suggestions: {
    title: 'Suggestions',
    empty: 'Aucune suggestion pour ce mois.',
    increase:
      'Les dépenses {{category}} ont augmenté de {{percent}} % par rapport au mois dernier — à surveiller.',
  },
  weekly: {
    title: 'Rapport hebdomadaire',
    spent: 'Dépensé',
    income: 'Revenus',
    highestDay: 'Jour le plus élevé : {{date}} · {{amount}}',
    topCategories: 'Principales catégories',
    empty: 'Aucune dépense cette semaine.',
  },
  errors: {
    loadWeekly: 'Impossible de charger le rapport hebdomadaire.',
    loadMonthly: 'Impossible de charger le rapport mensuel.',
  },
};
