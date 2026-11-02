/** Copy for first-run set-up (VS-92). Deliberately jargon-light. */
export const onboarding = {
  skip: 'Skip',
  skipLabel: 'Skip set-up and open the app',
  stepOf: '{{number}} / {{total}}',
  intro: {
    title: 'You know what you earn. But where does the money go?',
    body: 'A taxi, airtime, a meal: small expenses slip by unseen. Noted every day, they show what your month really costs.',
    start: 'Start',
    example: 'EXAMPLE',
    legend: {
      rent: 'Rent',
      food: 'Food',
      transport: 'Transport',
      unnoted: 'Not noted?',
    },
  },
  wallets: {
    title: 'What do your wallets hold today?',
    body: "Your starting point. A rough figure is fine; leave it blank if you don't know.",
    privacy: 'Your data stays on this phone. A PIN will protect access right after.',
    consentBody: 'Anonymous usage statistics, never amounts. Off by default.',
  },
  firstEntry: {
    title: 'Note your first expense',
    body: 'The last thing you paid for today. Ten seconds.',
  },
  /** Optional help, never a deadline (VS-88): it comes only when nothing is logged. */
  reminder: {
    title: 'Want a gentle reminder?',
    notedTitle: 'Noted. Your first day counts.',
    body: 'A reminder on evenings when nothing is noted? On other days, the app says nothing.',
    time: 'Reminder time',
    enable: 'Turn on reminder',
    later: 'No reminder',
    blocked: "Notifications are blocked for the app, so no reminder will be sent. You can allow them in your phone's settings.",
    continue: 'Continue',
  },
};
