import type { onboarding as en } from '@/i18n/locales/en/onboarding';
import type { Translation } from '@/i18n/translation.types';

/** French copy for first-run set-up (UX-08). */
export const onboarding: Translation<typeof en> = {
  skip: 'Passer la configuration',
  skipLabel: 'Passer la configuration et ouvrir l’application',
  stepOf: 'Étape {{number}} sur {{total}}',
  intro: {
    title: 'Sachez où va chaque franc',
    body: 'Notez ce que vous dépensez chaque jour pendant quelques mois, même les petites choses. L’application vous montre ensuite ce que coûte vraiment un mois, et vous aide à planifier le suivant.',
    start: 'Configurer — environ une minute',
    steps: {
      observe: { title: 'Observer', body: 'Tout noter pendant 3 mois complets, sans changer vos habitudes.' },
      see: { title: 'Comprendre', body: 'Voir ce que coûte vraiment un mois.' },
      plan: { title: 'Planifier', body: 'Faire le budget d’un mois à partir de votre propre moyenne.' },
      optimize: { title: 'Optimiser', body: 'Réduire là où cela rapporte le plus.' },
      grow: { title: 'Faire fructifier', body: 'Mettre ce que vous libérez au service d’objectifs et d’une réserve.' },
    },
  },
  wallets: {
    title: 'Que contiennent vos portefeuilles aujourd’hui ?',
    body: 'Espèces, Mobile Money, banque : indiquez ce que chacun contient maintenant, pour que vos soldes soient justes dès le premier jour.',
    later: 'Plus tard',
  },
  reminder: {
    title: 'Quand pouvez-vous noter vos dépenses ?',
    body: 'Choisissez un moment calme. Le rappel ne vient que les jours où rien n’est noté.',
    time: 'Heure du rappel quotidien',
    enable: 'Me le rappeler',
    later: 'Pas de rappel',
  },
};
