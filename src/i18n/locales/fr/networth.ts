import type { networth as en } from '@/i18n/locales/en/networth';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the net worth slice. */
export const networth: Translation<typeof en> = {
  title: 'Patrimoine',
  loading: 'Chargement…',
  today: 'Aujourd’hui',
  parts: {
    wallets: 'Portefeuilles {{amount}}',
    lent: 'Prêté {{amount}}',
    owed: 'Dû −{{amount}}',
    tontines: 'Tontines {{amount}}',
  },
  since: 'Depuis la fin de {{month}} : {{change}}',
  noHistory: 'L’historique commence dès qu’un mois est clos.',
  savings: {
    title: 'Taux d’épargne',
    thisMonth: 'Ce mois-ci pour l’instant : {{rate}} % des revenus gardés',
    thisMonthNone: 'Aucun revenu noté ce mois-ci.',
    month: '{{month}} : {{rate}} % des revenus gardés',
    monthOver: '{{month}} : {{rate}} % de dépenses en plus des revenus',
    monthNone: '{{month}} : aucun revenu noté',
  },
  openHistory: 'Historique',
  history: {
    title: 'Historique du patrimoine',
    intro:
      'Chaque mois est gardé tel qu’il était à sa fin : modifier une ancienne opération ne réécrit pas l’historique. Recalculez un mois pour le mettre à jour volontairement.',
    empty: 'Aucun mois n’est encore clos.',
    change: '{{change}} par rapport au mois d’avant',
    recalculate: 'Recalculer',
    recalculated: '{{month}} recalculé.',
  },
  errors: {
    load: 'Impossible de charger votre patrimoine.',
    recalculate: 'Impossible de recalculer le mois.',
  },
};
