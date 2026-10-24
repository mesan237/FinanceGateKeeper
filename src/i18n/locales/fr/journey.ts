import type { journey as en } from '@/i18n/locales/en/journey';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the journey slice (VS-63). */
export const journey: Translation<typeof en> = {
  title: 'Mon parcours',
  intro: 'La maîtrise vient étape par étape : observer, comprendre, planifier, puis réduire.',
  stepOf: 'Étape {{number}} sur {{total}}',
  status: {
    done: 'Terminée',
    skipped: 'Passée',
    current: 'Vous êtes ici',
    locked: 'Verrouillée',
  },
  steps: {
    observe: {
      title: 'Observer',
      goal: 'Notez tout pendant 3 mois complets, sans changer vos habitudes.',
      unlocks: 'Débloque votre point de départ : ce que vous coûte vraiment un mois.',
    },
    see: {
      title: 'Comprendre',
      goal: 'Lisez ce que vos premiers mois ont vraiment coûté.',
      unlocks: 'Débloque la planification à partir de votre propre moyenne.',
    },
    plan: {
      title: 'Planifier',
      goal: 'Budgétez un mois à partir de votre moyenne et vivez-le.',
      unlocks: 'Débloque l’optimisation : où réduire.',
    },
    optimize: {
      title: 'Optimiser',
      goal: 'Dépensez moins en charges variables qu’au départ.',
      unlocks: 'Débloque les objectifs, la réserve d’urgence et le « payez-vous d’abord ».',
    },
    grow: {
      title: 'Faire fructifier',
      goal: 'Faites travailler ce que vous libérez : objectifs, réserve d’urgence, patrimoine.',
    },
  },
  observe: {
    progress: '{{recorded}} mois complets sur {{needed}}',
    hint: 'Un mois compte dès que 80 % de ses jours sont notés, dépense ou journée sans dépense.',
    card_one: '{{recorded}} mois sur {{needed}} · ce mois-ci : jours notés {{logged}} sur {{count}}',
    card_other: '{{recorded}} mois sur {{needed}} · ce mois-ci : jours notés {{logged}} sur {{count}}',
    thisMonth_one: '{{month}} : jours notés {{logged}} sur {{count}}',
    thisMonth_other: '{{month}} : jours notés {{logged}} sur {{count}}',
    onTrack: 'En bonne voie : il lui faut {{needed}} jours notés sur {{days}}.',
    cannotCount: '{{month}} ne peut plus atteindre 80 %. Continuez à tout noter : il montre vos habitudes, et {{next}} comptera.',
    startedMidMonth: 'Vous avez commencé le {{date}} : {{month}} ne peut pas atteindre 80 %. Il montre quand même vos habitudes — votre premier mois complet sera {{next}}.',
    missedTitle: 'Rien de noté ces jours-là',
    missedHint: 'Rien dépensé ? Marquez le jour. Une dépense ? Ajoutez-la depuis Transactions, à sa date.',
    noSpend: 'Aucune dépense',
    noSpendA11y: 'Marquer le {{date}} comme journée sans dépense',
  },
  see: {
    summary: 'Vos premiers mois ont coûté {{total}} par mois : {{fixed}} de fixe, {{variable}} de variable.',
    reviewed: 'C’est vu',
    openReports: 'Ouvrir les rapports',
  },
  plan: {
    waiting: 'Validée quand un mois entièrement noté, après vos trois premiers, avait un budget.',
    done: 'Premier mois planifié : {{month}}',
    action: 'Planifier le mois prochain',
  },
  optimize: {
    compare: 'Dépenses variables : {{latest}} en {{month}}, contre {{start}} au départ.',
    waiting: 'Validée quand un mois planifié coûte moins en charges variables qu’au départ.',
    done: 'Vous avez dépensé moins qu’au départ en {{month}}.',
  },
  grow: {
    goals: 'Ouvrir les objectifs',
  },
  skip: {
    action: 'Passer à cette étape',
    title: 'Passer en avance ?',
    body: 'Les étapes précédentes seront marquées comme passées. L’application continue de compter vos mois : vous pourrez encore les terminer.',
    observeWarning: 'Budgétiser avant 3 mois complets rend votre point de départ moins fidèle : il montrera des habitudes que vous changiez déjà.',
    confirm: 'Passer en avance',
  },
  errors: {
    loadTitle: 'Impossible de charger votre parcours',
    load: 'Impossible de charger votre parcours.',
    outsideWindow: 'Seuls les {{days}} derniers jours peuvent être marqués sans dépense.',
  },
};
