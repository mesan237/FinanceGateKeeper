/** Copy for the debt slice: the people ledger of money lent and owed. */
export const debt = {
  directions: {
    lent: 'Lent',
    owed: 'Owed',
  },
  statuses: {
    pending: 'Pending',
    settled: 'Settled',
  },
  loading: 'Loading…',
  due: 'Due {{date}}',
  list: {
    title: 'Debts',
    outstanding: 'Outstanding: {{amount}}',
    empty: 'No debts here yet.',
    add: 'Add debt',
  },
  detail: {
    title: 'Debt',
    notFound: 'Debt not found.',
    invalidId: 'Invalid debt id.',
    settle: 'Mark settled',
  },
  form: {
    title: 'New Debt',
    person: 'Person',
    amount: 'Amount',
    dueDate: 'Due date',
    notePlaceholder: 'Note (optional)',
    note: 'Note',
  },
  errors: {
    createFailed: 'Failed to create debt.',
    loadDebts: 'Failed to load debts.',
    loadDebt: 'Failed to load debt.',
    settleFailed: 'Failed to settle debt.',
    updateFailed: 'Failed to update debt.',
    deleteFailed: 'Failed to delete debt.',
    remindersFailed: 'Failed to schedule reminders.',
    personRequired: 'Person name is required.',
    amountPositive: 'Debt amount must be a positive integer.',
    notExist: 'Debt {{id}} does not exist.',
  },
};
