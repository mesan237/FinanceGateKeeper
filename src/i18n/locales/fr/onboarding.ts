import type { onboarding as en } from '@/i18n/locales/en/onboarding';
import type { Translation } from '@/i18n/translation.types';

/** French copy for first-run set-up (UX-08, VS-87). */
export const onboarding: Translation<typeof en> = {
  skip: 'Passer la configuration',
  skipLabel: 'Passer la configuration et ouvrir l’application',
  stepOf: 'Étape {{number}} sur {{total}}',
  intro: {
    title: 'Un budget fondé sur vos vraies dépenses',
    body: 'Pendant quelques mois, vous notez ce que vous dépensez, espèces et Mobile Money compris. Vous voyez alors ce que coûte vraiment un mois, et vous planifiez à partir de là.',
    start: 'Commencer — environ une minute',
    stages: {
      now: {
        when: 'Maintenant',
        title: 'Observer',
        body: 'Notez vos dépenses au fil des jours. Rien dépensé ? Marquez la journée.',
      },
      after: {
        when: 'Après 3 mois complets',
        title: 'Planifier',
        body: 'Faites votre budget à partir de ce que vos mois ont vraiment coûté.',
      },
      then: {
        when: 'Ensuite',
        title: 'Optimiser',
        body: 'Voyez où vous avez de la marge, et ce que vous pouvez mettre de côté.',
      },
    },
    observeNote:
      'Un mois compte dès que 8 jours sur 10 sont notés : quelques oublis ne remettent rien en cause. Trois mois donnent une moyenne plus fiable qu’un seul, souvent faussé par une grosse dépense.',
    early:
      'Besoin d’un budget tout de suite ? Vous pouvez en faire un dès maintenant avec vos estimations. Vos mois continuent d’être comptés, et vous l’ajusterez avec vos vrais chiffres.',
  },
  wallets: {
    title: 'Que contiennent vos portefeuilles aujourd’hui ?',
    body: 'C’est votre point de départ : vos soldes seront justes dès le premier jour. Un montant approximatif suffit.',
    privacy:
      'Vos données restent sur ce téléphone. Rien n’est envoyé en ligne, sauf si vous activez plus tard la sauvegarde en ligne. Un code PIN protégera l’accès à la fin de la configuration.',
  },
  reminder: {
    title: 'Besoin d’un petit rappel ?',
    body: 'Notez vos dépenses quand vous voulez, au fil de la journée. Si aucune dépense n’est notée à l’heure choisie, l’application vous envoie un rappel. Les jours où c’est déjà fait, elle ne dit rien.',
    noSpendTip: "Rien dépensé ? Touchez « Je n'ai rien dépensé aujourd'hui » : la journée compte aussi.",
    time: 'Heure du rappel',
    enable: 'Activer le rappel',
    later: 'Pas de rappel',
    hint: 'Vous pourrez changer l’heure ou l’activer plus tard dans Préférences.',
    blocked: 'Les notifications sont bloquées pour l’application : aucun rappel ne sera envoyé. Vous pouvez les autoriser dans les réglages du téléphone.',
    continue: 'Continuer',
  },
};
