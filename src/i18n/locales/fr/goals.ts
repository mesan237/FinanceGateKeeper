import type { goals as en } from '@/i18n/locales/en/goals';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the goals slice. */
export const goals: Translation<typeof en> = {
  title: 'Objectifs',
  loading: 'Chargement…',
  intro: 'Chaque objectif a son propre portefeuille. Sa progression est le solde de ce portefeuille, et vous épargnez en y transférant de l’argent.',
  kinds: {
    buffer: 'Coussin de départ',
    sinking: 'Épargne dédiée',
  },
  list: {
    emptyTitle: 'Aucun objectif pour l’instant',
    emptySubtitle:
      'Constituez un petit coussin pour les imprévus, ou épargnez à l’avance pour une dépense connue comme la scolarité. Chaque objectif garde son argent dans un portefeuille à part.',
    add: 'Nouvel objectif',
    savedOf: '{{saved}} sur {{target}}',
    keptIn: 'Dans {{wallet}}',
    reached: 'Objectif atteint',
    byDate: 'Pour le {{date}} · {{amount}} par mois nécessaires',
    overdue: 'Date passée · il manque {{amount}}',
    notEnough: 'Vos {{monthly}} par mois ne suffiront pas à temps.',
    bufferPace_one: '{{monthly}} par mois · environ {{count}} mois restant',
    bufferPace_other: '{{monthly}} par mois · environ {{count}} mois restants',
    bufferNoPace: 'Indiquez un montant mensuel pour savoir quand vous y serez.',
    thisMonth: 'Ce mois-ci : {{saved}} épargnés sur {{monthly}}',
    saveNow: 'Épargner',
  },
  form: {
    newTitle: 'Nouvel objectif',
    editTitle: 'Modifier l’objectif',
    kindHint: {
      buffer: 'Un petit coussin pour les imprévus, pour qu’une mauvaise semaine ne devienne pas une dette.',
      sinking: 'De l’argent mis de côté pour une dépense connue à une date — scolarité, loyer, téléphone.',
    },
    name: 'Nom',
    namePlaceholder: {
      buffer: 'ex. Coussin de départ',
      sinking: 'ex. Scolarité',
    },
    target: 'Montant visé',
    essentialsSuggestion: 'Un mois de dépenses essentielles · {{amount}}',
    targetDate: 'Pour le',
    wallet: 'Gardé dans',
    walletHint: 'La progression est le solde de ce portefeuille. Choisissez un portefeuille réservé à cet objectif.',
    monthly: 'À mettre de côté chaque mois',
    neededSuggestion: 'Nécessaire : {{amount}} par mois',
    delete: 'Supprimer l’objectif',
    deleteTitle: 'Supprimer cet objectif ?',
    deleteBody: 'L’argent reste dans le portefeuille. Seul l’objectif est supprimé.',
  },
  errors: {
    nameRequired: 'Donnez un nom à l’objectif.',
    targetPositive: 'Le montant visé doit être un montant entier positif.',
    monthlyAmount: 'Le montant mensuel doit être un montant entier, zéro ou plus.',
    kindInvalid: 'Choisissez un coussin de départ ou une épargne dédiée.',
    dateRequired: 'Choisissez la date à laquelle l’argent est nécessaire.',
    walletInvalid: 'Choisissez un portefeuille actif pour cet objectif.',
    walletTaken: 'Ce portefeuille contient déjà un autre objectif. Choisissez-en un à part.',
    notFound: 'Cet objectif n’existe plus.',
    invalidId: 'Cet objectif est introuvable.',
    loadGoals: 'Impossible de charger vos objectifs.',
    saveFailed: 'Impossible d’enregistrer l’objectif.',
    deleteFailed: 'Impossible de supprimer l’objectif.',
  },
};
