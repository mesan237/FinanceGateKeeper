import type { events as en } from '@/i18n/locales/en/events';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the events slice (VS-61). */
export const events: Translation<typeof en> = {
  title: 'Événements',
  loading: 'Chargement…',
  intro: 'Rattachez les dépenses d’une occasion (mariage, deuil, voyage) pour voir ce qu’elle a vraiment coûté.',
  list: {
    emptyTitle: 'Aucun événement',
    emptySubtitle:
      'Créez-en un pour une occasion (mariage, deuil, voyage), puis choisissez-le en notant ce qu’elle coûte : transport, cadeaux, vêtements.',
    add: 'Nouvel événement',
    total: '{{amount}}',
    count_one: '{{count}} dépense',
    count_other: '{{count}} dépenses',
    noDate: 'Sans date',
  },
  form: {
    createTitle: 'Nouvel événement',
    editTitle: 'Modifier l’événement',
    name: 'Nom',
    namePlaceholder: 'ex. Mariage de Marie',
    hint: 'Pour une occasion ponctuelle : un mariage, un voyage, un deuil. Une dépense régulière a sa place dans une catégorie.',
    date: 'Date (facultative)',
    clearDate: 'Sans date',
    save: 'Enregistrer',
  },
  detail: {
    total: 'Total',
    byCategory: 'Par catégorie',
    expenses: 'Dépenses',
    noExpenses: 'Aucune dépense n’est encore rattachée. Choisissez cet événement en notant une dépense.',
    edit: 'Modifier',
    delete: 'Supprimer l’événement',
    deleteTitle: 'Supprimer cet événement ?',
    deleteBody: 'Ses dépenses restent telles quelles ; elles perdent seulement le rattachement.',
    refund: 'Remboursement · {{category}}',
  },
  picker: {
    label: 'Événement',
    none: 'Aucun événement',
    hint: 'Était-ce pour une occasion ?',
    title: 'Pour quel événement ?',
    create: 'Nouvel événement',
  },
  errors: {
    nameRequired: 'Donnez un nom à l’événement.',
    dateFormat: 'La date doit être au format AAAA-MM-JJ.',
    notFound: 'Cet événement n’existe plus.',
    load: 'Impossible de charger les événements.',
    save: 'Impossible d’enregistrer l’événement.',
  },
};
