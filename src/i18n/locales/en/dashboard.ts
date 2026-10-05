/** Copy for the dashboard: the month overview, today's spending, quick log and wallets. */
export const dashboard = {
  loading: 'Loading…',
  retry: 'Retry',
  pace: {
    green: 'On Track',
    yellow: 'Watch Out',
    red: 'Over Budget',
  },
  month: {
    lastDay: 'Last day',
    daysLeft_one: '{{count}} day left',
    daysLeft_other: '{{count}} days left',
    overBy: 'Over budget by',
    leftToSpend: 'Left to spend',
    spentOf: '{{spent}} of {{budget}} spent',
    setBudget: 'Set a monthly budget to track this',
    in: 'In',
    out: 'Out',
    net: 'Net',
    unplanned_one: '{{count}} unexpected expense · {{amount}}',
    unplanned_other: '{{count}} unexpected expenses · {{amount}}',
  },
  today: {
    title: "Today's Spending",
    overPace: 'Over your daily pace of {{amount}}',
    withinPace: 'Within your daily pace of {{amount}}',
    trend: 'Last 7 days · peak {{amount}}',
  },
  quickLog: {
    title: 'Quick log',
    expense: 'Expense',
    expenseSubtitle: 'Money out',
    expenseA11y: 'Log an expense',
    income: 'Income',
    incomeSubtitle: 'Money in',
    incomeA11y: 'Log income',
    zeroDay: 'I spent nothing today',
    zeroDayA11y: 'Confirm I spent nothing today',
  },
  wallets: {
    title: 'Wallets',
    emptyBody: 'Track cash and Mobile Money separately by setting up your wallets.',
    emptyCta: 'Set up your wallets →',
  },
  errors: {
    loadFailed: 'Failed to load dashboard.',
  },
};
