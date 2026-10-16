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
    ofAmount: 'sur {{amount}}',
    title: 'Dettes',
    outstanding: 'Restant dû : {{amount}}',
    empty: 'Aucune dette ici pour le moment.',
    add: 'Ajouter une dette',
  },
  detail: {
    title: 'Dette',
    notFound: 'Dette introuvable.',
    invalidId: 'Identifiant de dette invalide.',
    recordRepayment: 'Enregistrer un remboursement',
    progress: 'Remboursé {{paid}} · reste dû {{outstanding}}',
    repayments: 'Remboursements',
    noAccount: 'Aucun compte',
    removePaymentTitle: 'Supprimer ce remboursement ?',
    removePaymentBody: 'Le montant dû remonte, et le solde du compte suit.',
    removePayment: 'Supprimer',
  },
  form: {
    title: 'Nouvelle dette',
    throughAccount: 'Via un compte',
    paidFrom: 'Payé depuis',
    receivedIn: 'Reçu sur',
    person: 'Personne',
    amount: 'Montant',
    dueDate: "Date d'échéance",
    notePlaceholder: 'Note (facultatif)',
    note: 'Note',
  },
  repayment: {
    title: 'Enregistrer un remboursement',
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
    paymentAmount: 'Un remboursement doit être un montant entier positif.',
    paymentDate: 'Choisissez une date valide pour le remboursement.',
    paymentTooLarge: 'C’est plus que ce qui reste dû.',
    debtClosed: 'Cette dette est déjà réglée ou supprimée.',
    belowRepaid: 'Le montant ne peut pas être inférieur à ce qui a déjà été remboursé.',
    paymentFailed: "Impossible d'enregistrer le remboursement.",
  },
};
