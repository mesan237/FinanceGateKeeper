/** Words shared across every screen: actions, states and fixed enums. */
export const common = {
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    done: 'Done',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    retry: 'Try again',
    clear: 'Clear',
  },
  fields: {
    loading: 'Loading',
    selectDate: 'Select date',
    setTime: 'Set time',
    select: 'Select',
    selectTitled: 'Select {{title}}',
    amountInFcfa: 'Amount in FCFA',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
  },
  states: {
    errorTitle: "Couldn't load this",
    errorBody: 'Nothing you logged is lost.',
  },
  change: {
    new: 'New',
  },
  why: {
    title: 'Why you spent',
    routine: 'Routine',
    routineHint: 'Recurring bills and fixed costs',
    event: 'Events',
    eventHint: 'Occasions you tagged',
    unexpected: 'Unexpected',
    unexpectedHint: 'Spending that caught you off guard',
    everyday: 'Everyday',
    everydayHint: 'The habits you can change',
    expenses_one: '{{count}} expense',
    expenses_other: '{{count}} expenses',
  },
  errors: {
    syncFailed: 'Sync failed.',
  },
  languages: {
    en: 'English',
    fr: 'Français',
    /** The FR | EN toggle (VS-86): the group's name, and each language's short code. */
    label: 'Language',
    shortEn: 'EN',
    shortFr: 'FR',
  },
  incomeSources: {
    salary: 'Salary',
    freelance: 'Freelance',
    business: 'Business / side business',
    ecommerce: 'E-commerce',
    gift: 'Gift & family support',
    other: 'Other',
  },
  /** The optional-analytics switch (VS-90), in the set-up and in Preferences. */
  analytics: {
    title: 'Help improve the app',
    body: 'Share anonymous usage: which screens you open and whether saves work. Never amounts, notes, names or categories. Off unless you turn it on.',
    saveError: "Couldn't save this choice. Try again.",
  },
};
