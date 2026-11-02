import type { onboarding as en } from '@/i18n/locales/en/onboarding';
import type { Translation } from '@/i18n/translation.types';

/** French copy for first-run set-up (VS-92). */
export const onboarding: Translation<typeof en> = {
  skip: 'Passer',
  skipLabel: 'Passer la configuration et ouvrir l’application',
  stepOf: '{{number}} / {{total}}',
  intro: {
    title: 'Vous savez ce que vous gagnez. Mais où part l’argent ?',
    body: 'Un taxi, du crédit, un repas : les petites dépenses passent sans qu’on les voie. Notées chaque jour, elles montrent ce que coûte vraiment votre mois.',
    start: 'Commencer',
    example: 'EXEMPLE',
    legend: {
      rent: 'Loyer',
      food: 'Alimentation',
      transport: 'Transport',
      unnoted: 'Non noté ?',
    },
  },
  wallets: {
    title: 'Que contiennent vos portefeuilles aujourd’hui ?',
    body: 'Votre point de départ. Un montant approximatif suffit ; laissez vide si vous ne savez pas.',
    privacy: 'Vos données restent sur ce téléphone. Un code PIN protégera l’accès juste après.',
    consentBody: 'Statistiques d’usage anonymes, jamais de montants. Désactivé par défaut.',
  },
  firstEntry: {
    title: 'Notez votre première dépense',
    body: 'La dernière chose que vous avez payée aujourd’hui. Dix secondes.',
  },
  reminder: {
    title: 'Besoin d’un petit rappel ?',
    notedTitle: 'C’est noté. Votre premier jour compte.',
    body: 'Un rappel les soirs où rien n’est noté ? Les autres jours, l’application ne dit rien.',
    time: 'Heure du rappel',
    enable: 'Activer le rappel',
    later: 'Pas de rappel',
    blocked: 'Les notifications sont bloquées pour l’application : aucun rappel ne sera envoyé. Vous pouvez les autoriser dans les réglages du téléphone.',
    continue: 'Continuer',
  },
};
