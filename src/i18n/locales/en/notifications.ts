/** Copy for local notifications and the in-app alerts built from them. */
export const notifications = {
  channel: {
    name: 'Daily reminders',
    description: 'End-of-day reminders to log your spending.',
  },
  dailyReminder: {
    title: 'Log your spending',
    body: "Take a few seconds to record today's expenses before the day ends.",
  },
  zeroDayCheck: {
    title: 'Did you spend nothing today?',
    body: 'Confirm you spent nothing today, or log what you spent.',
  },
  overBudget: {
    title: 'Over budget',
    body: 'This expense puts you over your budget.',
    bodyCategory: 'This expense puts you {{amount}} over your {{category}} budget.',
    bodyMonth: 'This expense puts you {{amount}} over your monthly expense budget.',
  },
  debtDueDate: {
    title: 'Debt due soon',
    body: 'A debt is approaching its due date.',
    bodyDueSoon: '{{person}} — {{amount}} is due on {{date}}.',
    bodyOverdue: '{{person}} — {{amount}} is overdue (was due {{date}}).',
  },
};
