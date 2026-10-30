import type { common as en } from '@/i18n/locales/en/common';
import type { Translation } from '@/i18n/translation.types';

/** French words shared across every screen. */
export const common: Translation<typeof en> = {
  actions: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    done: 'Terminé',
    confirm: 'Confirmer',
    close: 'Fermer',
    back: 'Retour',
    clear: 'Effacer',
    retry: 'Réessayer',
  },
  fields: {
    loading: 'Chargement',
    selectDate: 'Choisir une date',
    setTime: "Choisir l'heure",
    select: 'Choisir',
    selectTitled: 'Choisir : {{title}}',
    amountInFcfa: 'Montant en FCFA',
    previousMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
  },
  states: {
    errorTitle: 'Impossible de charger',
    errorBody: 'Rien de ce que vous avez noté n’est perdu.',
  },
  change: {
    new: 'Nouveau',
  },
  why: {
    title: 'Pourquoi vous avez dépensé',
    routine: 'Routine',
    routineHint: 'Factures récurrentes et dépenses fixes',
    event: 'Événements',
    eventHint: 'Les occasions que vous avez rattachées',
    unexpected: 'Imprévus',
    unexpectedHint: 'Les dépenses qui vous ont pris de court',
    everyday: 'Quotidien',
    everydayHint: 'Les habitudes que vous pouvez changer',
    expenses_one: '{{count}} dépense',
    expenses_other: '{{count}} dépenses',
  },
  errors: {
    syncFailed: 'La synchronisation a échoué.',
  },
  // Each language is named in itself, so it stays findable whatever the UI is in.
  languages: {
    en: 'English',
    fr: 'Français',
    label: 'Langue',
    shortEn: 'EN',
    shortFr: 'FR',
  },
  incomeSources: {
    salary: 'Salaire',
    freelance: 'Freelance',
    ecommerce: 'E-commerce',
  },
  analytics: {
    title: 'Aider à améliorer l’application',
    body: 'Partager des statistiques d’usage anonymes : les écrans ouverts et la réussite des enregistrements. Jamais de montants, de notes, de noms ni de catégories. Désactivé tant que vous ne l’activez pas.',
    saveError: 'Impossible d’enregistrer ce choix. Réessayez.',
  },
};
