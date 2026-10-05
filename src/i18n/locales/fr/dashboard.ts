import type { dashboard as en } from '@/i18n/locales/en/dashboard';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the dashboard. */
export const dashboard: Translation<typeof en> = {
  loading: 'Chargement…',
  retry: 'Réessayer',
  pace: {
    green: 'Dans les clous',
    yellow: 'Attention',
    red: 'Budget dépassé',
  },
  month: {
    lastDay: 'Dernier jour',
    daysLeft_one: '{{count}} jour restant',
    daysLeft_other: '{{count}} jours restants',
    overBy: 'Budget dépassé de',
    leftToSpend: 'Reste à dépenser',
    spentOf: '{{spent}} dépensés sur {{budget}}',
    setBudget: 'Fixez un budget mensuel pour suivre ceci',
    in: 'Entrées',
    out: 'Sorties',
    net: 'Solde',
    unplanned_one: '{{count}} imprévu · {{amount}}',
    unplanned_other: '{{count}} imprévus · {{amount}}',
  },
  planned: {
    dueSoon_one: '{{count}} achat prévu à venir',
    dueSoon_other: '{{count}} achats prévus à venir',
    overdue_one: '{{count}} achat prévu en retard',
    overdue_other: '{{count}} achats prévus en retard',
    open: 'Ouvrir les achats prévus',
  },
  today: {
    title: "Dépenses d'aujourd'hui",
    overPace: 'Au-dessus de votre rythme quotidien de {{amount}}',
    withinPace: 'Dans votre rythme quotidien de {{amount}}',
    trend: '7 derniers jours · pic à {{amount}}',
  },
  quickLog: {
    title: 'Saisie rapide',
    expense: 'Dépense',
    expenseSubtitle: 'Argent sortant',
    expenseA11y: 'Enregistrer une dépense',
    income: 'Revenu',
    incomeSubtitle: 'Argent entrant',
    incomeA11y: 'Enregistrer un revenu',
    zeroDay: "Je n'ai rien dépensé aujourd'hui",
    zeroDayA11y: "Confirmer que je n'ai rien dépensé aujourd'hui",
  },
  wallets: {
    title: 'Portefeuilles',
    emptyBody: 'Suivez séparément vos espèces et votre Mobile Money en créant vos portefeuilles.',
    emptyCta: 'Créer vos portefeuilles →',
  },
  errors: {
    loadFailed: 'Impossible de charger le tableau de bord.',
  },
};
