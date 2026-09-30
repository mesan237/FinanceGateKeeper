import type { debt as en } from '@/i18n/locales/en/debt';
import type { Translation } from '@/i18n/translation.types';

/** French copy for the debt slice. */
export const debt: Translation<typeof en> = {
  directions: {
    lent: 'Prêté',
    owed: 'Emprunté',
  },
  statuses: {
    pending: 'En cours',
    settled: 'Réglée',
  },
  loading: 'Chargement…',
  due: 'Échéance : {{date}}',
  list: {
    title: 'Dettes',
    outstanding: 'Restant dû : {{amount}}',
    empty: 'Aucune dette ici pour le moment.',
    add: 'Ajouter une dette',
  },
  detail: {
    title: 'Dette',
    notFound: 'Dette introuvable.',
    invalidId: 'Identifiant de dette invalide.',
    settle: 'Marquer comme réglée',
  },
  form: {
    title: 'Nouvelle dette',
    person: 'Personne',
    amountPlaceholder: 'Montant (FCFA)',
    amount: 'Montant',
    duePlaceholder: "Date d'échéance (AAAA-MM-JJ, facultatif)",
    dueDate: "Date d'échéance",
    notePlaceholder: 'Note (facultatif)',
    note: 'Note',
  },
  errors: {
    createFailed: 'Impossible de créer la dette.',
    loadDebts: 'Impossible de charger les dettes.',
    loadDebt: 'Impossible de charger la dette.',
    settleFailed: 'Impossible de régler la dette.',
    updateFailed: 'Impossible de modifier la dette.',
    deleteFailed: 'Impossible de supprimer la dette.',
    remindersFailed: 'Impossible de programmer les rappels.',
    personRequired: 'Le nom de la personne est obligatoire.',
    amountPositive: 'Le montant de la dette doit être un entier positif.',
    notExist: "La dette {{id}} n'existe pas.",
  },
};
