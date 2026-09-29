/** Copy for the income slice: logging, editing and validation. */
export const income = {
  notePlaceholder: 'Note (optional)',
  noteLabel: 'Note',
  account: 'Account',
  log: {
    title: 'Log Income',
  },
  detail: {
    title: 'Edit Income',
    notFoundTitle: 'Income',
    notFound: 'Income not found.',
    updated: 'Income updated',
    deleted: 'Income deleted',
    delete: 'Delete income',
    deleteTitle: 'Delete income?',
    deleteBody: 'This income will be removed from your records. This cannot be undone.',
  },
  validation: {
    amountRequired: 'Enter an amount greater than 0.',
    sourceRequired: 'Pick a source.',
  },
  errors: {
    saveFailed: 'Failed to save income.',
    loadFailed: 'Failed to load income.',
    updateFailed: 'Failed to update income.',
    deleteFailed: 'Failed to delete income.',
    amountPositive: 'Income amount must be a positive integer (FCFA).',
    unknownSource: 'Unknown income source: {{source}}.',
    notFound: 'Income not found.',
  },
};
