/**
 * The analytics event catalogue (VS-90). Every event the app may send, and the
 * only properties each may carry, are listed here; anything else is dropped
 * before it reaches the provider. The meaning of each event is documented in
 * docs/ANALYTICS.md. No property may hold an amount, a balance, free text, a
 * name the user typed, or a record id.
 */

/** One allowed property: a closed set of strings, a flag, a duration or a route template. */
export type PropertySpec =
  | { readonly kind: 'enum'; readonly values: readonly string[] }
  | { readonly kind: 'boolean' }
  | { readonly kind: 'duration' }
  | { readonly kind: 'route' };

const oneOf = <const V extends readonly string[]>(values: V) => ({ kind: 'enum', values }) as const;
const flag = { kind: 'boolean' } as const;
/** Milliseconds, a whole number from 0 to 10 minutes. */
const duration = { kind: 'duration' } as const;
/** A route template: lowercase segments and `[param]` placeholders only. */
const route = { kind: 'route' } as const;

const EXPENSE_ENTRY = oneOf(['log_screen', 'add_sheet', 'quick_add']);
const INCOME_ENTRY = oneOf(['log_screen', 'add_sheet']);
const ONBOARDING_STEP = oneOf(['intro', 'wallets', 'reminder']);
const FAILURE = oneOf(['save_error']);

/** The drawer rows, by their navigation key (the `feature_entry_point_selected` features). */
export const DRAWER_FEATURES = [
  'accounts',
  'goals',
  'debts',
  'tontines',
  'planned',
  'events',
  'categories',
  'preferences',
  'backupRestore',
  'exportImport',
  'feedback',
  'privacy',
] as const;

/** One drawer row, by its navigation key. */
export type DrawerFeature = (typeof DRAWER_FEATURES)[number];

export const ANALYTICS_EVENTS = {
  // Lifecycle
  app_opened: { trigger: oneOf(['launch', 'foreground']) },
  screen_viewed: { screen_name: route },

  // Consent: sent once, right after the user opts in.
  analytics_enabled: { entry_point: oneOf(['onboarding', 'settings']) },

  // Onboarding (only after an opt-in on its first step)
  onboarding_step_completed: { workflow_step: ONBOARDING_STEP },
  onboarding_completed: { reminder: oneOf(['on', 'blocked', 'later']) },
  onboarding_skipped: { workflow_step: ONBOARDING_STEP },

  // Expenses
  expense_validation_failed: {
    entry_point: EXPENSE_ENTRY,
    invalid_field: oneOf(['amount', 'category', 'amount_and_category']),
  },
  expense_created: {
    entry_point: EXPENSE_ENTRY,
    marked_unplanned: flag,
    linked_event: flag,
    has_subcategory: flag,
    operation_duration_ms: duration,
  },
  expense_creation_failed: { entry_point: EXPENSE_ENTRY, failure_reason_code: FAILURE },
  expense_edited: {},
  expense_deleted: {},

  // Income
  income_validation_failed: {
    entry_point: INCOME_ENTRY,
    invalid_field: oneOf(['amount', 'source', 'amount_and_source']),
  },
  income_created: { entry_point: INCOME_ENTRY, operation_duration_ms: duration },
  income_creation_failed: { entry_point: INCOME_ENTRY, failure_reason_code: FAILURE },
  income_edited: {},
  income_deleted: {},

  // Debts
  debt_created: { has_total_to_repay: flag, has_instalments: flag, has_due_date: flag, operation_duration_ms: duration },
  debt_creation_failed: { failure_reason_code: FAILURE },
  debt_updated: {},
  debt_deleted: { entry_point: oneOf(['list', 'detail']) },
  debt_repayment_recorded: { action_type: oneOf(['payment', 'instalment', 'settle']) },

  // Budget
  budget_adjustment_completed: {
    entry_point: oneOf(['planner', 'category_detail']),
    action_type: oneOf(['save_plan', 'set_envelope', 'remove_envelope', 'cover_from']),
  },

  // Failures of edits, deletes and other non-create writes
  operation_failed: {
    feature_name: oneOf(['expense', 'income', 'debt', 'budget']),
    action_type: oneOf(['edit', 'delete', 'repay', 'adjust']),
    failure_reason_code: FAILURE,
  },

  // Discovery
  feature_entry_point_selected: { feature_name: oneOf(DRAWER_FEATURES), entry_point: oneOf(['drawer']) },
  feedback_started: { entry_point: oneOf(['drawer']) },
} as const satisfies Record<string, Record<string, PropertySpec>>;

/** Properties the service adds to every event. */
export const COMMON_PROPERTIES = {
  app_language: oneOf(['fr', 'en']),
} as const satisfies Record<string, PropertySpec>;

/** Every event name in the catalogue. */
export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS;

type ValueOf<S> = S extends { kind: 'enum'; values: readonly (infer V)[] }
  ? V
  : S extends { kind: 'boolean' }
    ? boolean
    : S extends { kind: 'duration' }
      ? number
      : string;

/** The typed, optional properties an event accepts. */
export type AnalyticsEventProps<E extends AnalyticsEventName> = {
  [K in keyof (typeof ANALYTICS_EVENTS)[E]]?: ValueOf<(typeof ANALYTICS_EVENTS)[E][K]>;
};

/**
 * Keys that must never be sent, whatever the event. The allowlist already
 * blocks them; the list documents the rule and lets tests enforce it.
 */
export const PROHIBITED_PROPERTY_KEYS = [
  'amount',
  'balance',
  'note',
  'description',
  'name',
  'person_name',
  'category',
  'category_id',
  'subcategory',
  'subcategory_id',
  'account',
  'account_id',
  'wallet',
  'email',
  'phone',
  'password',
  'pin',
  'token',
  'user_id',
  'url',
  'query',
  'params',
] as const;

/** Fragments no property key may contain (money and free-text words). */
export const PROHIBITED_KEY_FRAGMENTS = [
  'amount',
  'balance',
  'note',
  'description',
  'email',
  'phone',
  'password',
  'token',
  'total_fcfa',
  'price',
  'text',
] as const;
