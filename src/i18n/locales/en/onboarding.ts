/** Copy for first-run set-up (UX-08, VS-87). Deliberately jargon-light. */
export const onboarding = {
  skip: 'Skip set-up',
  skipLabel: 'Skip set-up and open the app',
  stepOf: 'Step {{number}} of {{total}}',
  intro: {
    title: 'A budget built on what you really spend',
    body: 'For a few months, you note what you spend, cash and Mobile Money included. Then you see what a month really costs, and you plan from there.',
    start: 'Start — about a minute',
    /** Three stages, not the path's five: See and Grow are explained on My path. */
    stages: {
      now: { when: 'Now', title: 'Observe', body: 'Note your spending as the days go. Spent nothing? Mark the day.' },
      after: {
        when: 'After 3 complete months',
        title: 'Plan',
        body: 'Build your budget from what your months really cost.',
      },
      then: { when: 'Then', title: 'Optimize', body: 'See where you have room, and what you can set aside.' },
    },
    observeNote:
      "A month counts once 8 days in 10 are logged, so a few gaps don't matter. Three months give a steadier average than one, which a single big expense can skew.",
    early:
      'Need a budget right away? You can make one now from your estimates. Your months keep counting, and you can adjust it with your real figures.',
  },
  wallets: {
    title: 'What do your wallets hold today?',
    body: 'This is your starting point, so your balances are right from day one. A rough figure is fine.',
    privacy:
      'Your data stays on this phone. Nothing is sent online unless you turn on online backup later. A PIN will lock the app at the end of set-up.',
  },
  reminder: {
    title: 'When can you log each day?',
    body: 'Pick a quiet moment. You get a reminder only on days with nothing logged.',
    time: 'Daily reminder time',
    enable: 'Remind me',
    later: 'No reminders',
  },
};
