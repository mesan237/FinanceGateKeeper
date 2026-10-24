/** Copy for the journey slice: the "My path" tab and its dashboard card (VS-63). */
export const journey = {
  title: 'My path',
  loading: 'Loading your path…',
  intro: 'Control comes step by step: watch, understand, plan, then cut back.',
  stepOf: 'Step {{number}} of {{total}}',
  status: {
    done: 'Done',
    skipped: 'Skipped',
    current: 'You are here',
    locked: 'Locked',
  },
  steps: {
    observe: {
      title: 'Observe',
      goal: 'Log everything for 3 complete months, without changing your habits.',
      unlocks: 'Unlocks your starting point: what a month really costs you.',
    },
    see: {
      title: 'See',
      goal: 'Read what your first months really cost.',
      unlocks: 'Unlocks planning from your own average.',
    },
    plan: {
      title: 'Plan',
      goal: 'Budget a month from your average and live it.',
      unlocks: 'Unlocks optimization: where to cut back.',
    },
    optimize: {
      title: 'Optimize',
      goal: 'Spend less on variable costs than when you started.',
      unlocks: 'Unlocks goals, an emergency reserve and paying yourself first.',
    },
    grow: {
      title: 'Grow',
      goal: 'Put what you free up to work: goals, an emergency reserve, your net worth.',
    },
  },
  observe: {
    progress: '{{recorded}} of {{needed}} complete months',
    hint: 'A month counts once 80% of its days are logged, spending or a no-spend day.',
  },
  see: {
    summary: 'Your first months cost {{total}} a month: {{fixed}} fixed, {{variable}} variable.',
    reviewed: 'I’ve seen it',
    openReports: 'Open Reports',
  },
  plan: {
    waiting: 'Passes when a fully logged month after your first three had a budget.',
    done: 'First planned month: {{month}}',
    action: 'Plan next month',
  },
  optimize: {
    compare: 'Variable spending: {{latest}} in {{month}}, against {{start}} at the start.',
    waiting: 'Passes when a planned month spends less on variable costs than at the start.',
    done: 'You spent less than at the start in {{month}}.',
  },
  grow: {
    goals: 'Open goals',
  },
  skip: {
    action: 'Skip to this step',
    title: 'Skip ahead?',
    body: 'The steps before it will show as skipped. The app keeps counting your months, so you can still complete them.',
    observeWarning: 'Budgeting before 3 complete months makes your starting point less honest: it will show habits you were already changing.',
    confirm: 'Skip ahead',
  },
  errors: {
    load: 'Could not load your path.',
  },
};
