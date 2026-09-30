import type { planned as en } from '@/i18n/locales/en/planned';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the planned-purchases slice. */
export const planned: Translation<typeof en> = {
  errors: {
    nameRequired: 'Donnez-lui un nom.',
    amountWhole: "L'estimation doit être un nombre entier de FCFA supérieur à zéro.",
    categoryRequired: 'Choisissez une catégorie.',
    dateFormat: 'La date doit être au format AAAA-MM-JJ.',
    listNotFound: "Cette liste n'existe plus.",
    itemNotFound: "Cet article n'existe plus.",
  },
};
