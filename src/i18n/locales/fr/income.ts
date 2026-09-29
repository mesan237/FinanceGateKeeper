import type { income as en } from '@/i18n/locales/en/income';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the income slice. */
export const income: Translation<typeof en> = {
  notePlaceholder: 'Note (facultatif)',
  noteLabel: 'Note',
  account: 'Compte',
  log: {
    title: 'Nouveau revenu',
  },
  detail: {
    title: 'Modifier le revenu',
    invalidId: 'Identifiant de revenu invalide.',
    invalidEdit: 'Saisissez un montant supérieur à 0 et choisissez une source.',
    notFoundTitle: 'Revenu',
    notFound: 'Revenu introuvable.',
    updated: 'Revenu modifié',
    deleted: 'Revenu supprimé',
    delete: 'Supprimer le revenu',
    deleteTitle: 'Supprimer le revenu ?',
    deleteBody: 'Ce revenu sera retiré de vos données. Cette action est irréversible.',
  },
  validation: {
    amountRequired: 'Saisissez un montant supérieur à 0.',
    sourceRequired: 'Choisissez une source.',
  },
  errors: {
    saveFailed: "Impossible d'enregistrer le revenu.",
    loadFailed: 'Impossible de charger le revenu.',
    updateFailed: 'Impossible de modifier le revenu.',
    deleteFailed: 'Impossible de supprimer le revenu.',
    amountPositive: 'Le montant du revenu doit être un entier positif (FCFA).',
    unknownSource: 'Source de revenu inconnue : {{source}}.',
    notFound: 'Revenu introuvable.',
  },
};
