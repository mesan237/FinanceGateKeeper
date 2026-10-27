/** Copy for local notifications and the in-app alerts built from them. */
export const notifications = {
  channel: {
    name: 'Daily reminders',
    description: 'A reminder on days with no spending logged yet.',
  },
  dailyReminder: {
    title: 'No spending logged today',
    body: 'Spent something, or nothing at all? Log it in a few seconds.',
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
    bodyInstalmentDueSoon: '{{person}} — instalment {{n}}: {{amount}} due on {{date}}.',
    bodyInstalmentsOverdue_one: '{{person}} — {{count}} instalment overdue ({{amount}}).',
    bodyInstalmentsOverdue_other: '{{person}} — {{count}} instalments overdue ({{amount}}).',
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
  tontineDue: {
    title: 'Tontine contribution',
    body: 'A tontine contribution is due.',
    bodySoon: '{{tontine}}: {{amount}} to pay on {{date}}.',
    bodyToday: '{{tontine}}: {{amount}} to pay today.',
    bodyOverdue_one: '{{tontine}}: {{count}} contribution overdue ({{amount}}).',
    bodyOverdue_other: '{{tontine}}: {{count}} contributions overdue ({{amount}}).',
  },
};
