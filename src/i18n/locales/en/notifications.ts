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
  plannedDue: {
    title: 'Planned purchase',
    body: 'You have planned purchases coming up.',
    bodySoon_one: '{{list}}: {{count}} item to buy by {{date}} ({{amount}}).',
    bodySoon_other: '{{list}}: {{count}} items to buy by {{date}} ({{amount}}).',
    bodyToday_one: '{{list}}: {{count}} item to buy today ({{amount}}).',
    bodyToday_other: '{{list}}: {{count}} items to buy today ({{amount}}).',
    bodyOverdue_one: '{{list}}: {{count}} item still to buy — it was due {{date}}.',
    bodyOverdue_other: '{{list}}: {{count}} items still to buy — they were due {{date}}.',
  },
};
