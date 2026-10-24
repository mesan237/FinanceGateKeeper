/** Copy for the net worth slice (VS-53): money-only net worth, month-end history, savings rate. */
export const networth = {
  title: 'Net worth',
  loading: 'Loading…',
  today: 'Today',
  parts: {
    wallets: 'Wallets {{amount}}',
    lent: 'Lent {{amount}}',
    owed: 'Owed −{{amount}}',
    tontines: 'Tontines {{amount}}',
  },
  since: 'Since the end of {{month}}: {{change}}',
  noHistory: 'History starts once a month has closed.',
  savings: {
    title: 'Savings rate',
    thisMonth: 'This month so far: {{rate}}% of income kept',
    thisMonthNone: 'No income logged this month yet.',
    month: '{{month}}: {{rate}}% of income kept',
    monthOver: '{{month}}: spent {{rate}}% more than came in',
    monthNone: '{{month}}: no income logged',
  },
  openHistory: 'History',
  history: {
    title: 'Net worth history',
    intro:
      'Each month is kept as it stood at its end, so editing an old entry does not rewrite history. Recalculate a month to bring it up to date on purpose.',
    empty: 'No month has closed yet.',
    change: '{{change}} on the month before',
    recalculate: 'Recalculate',
    recalculated: '{{month}} recalculated.',
  },
  errors: {
    loadTitle: "Couldn't load your net worth",
    load: 'Failed to load your net worth.',
    recalculate: 'Failed to recalculate the month.',
  },
};
