import type { onboarding as en } from '@/i18n/locales/en/onboarding';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the first-run onboarding carousel. */
export const onboarding: Translation<typeof en> = {
  skip: 'Passer',
  skipLabel: "Passer l'introduction",
  next: 'Suivant',
  getStarted: 'Commencer',
  chips: {
    expenses: 'Dépenses',
    income: 'Revenus',
    budgets: 'Budgets',
    debts: 'Dettes',
  },
  panels: {
    track: {
      title: 'Suivez chaque franc',
      body: "Notez chaque revenu et chaque dépense au moment où ils arrivent. Cette habitude quotidienne, c'est l'essentiel — tout le reste en découle.",
    },
    budget: {
      title: 'Un budget par catégorie',
      body: "Donnez à chaque catégorie une enveloppe mensuelle. Finance Gatekeeper la compare au jour du mois, pour savoir si vous êtes en avance ou en retard avant la fin du mois.",
    },
    reports: {
      title: "Voyez où est passé l'argent",
      body: 'Les rapports détaillent le mois par catégorie et le comparent au précédent, pour que les tendances apparaissent d’elles-mêmes.',
    },
    done: {
      title: 'Tout est prêt',
      body: "Programmez un rappel quotidien à tout moment dans les Paramètres pour ne jamais oublier une journée. C'est parti !",
    },
  },
};
