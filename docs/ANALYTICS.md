# Product analytics (VS-90)

Optional, anonymous usage analytics that show which features are used, where workflows succeed
or fail, and whether a release made things better or worse. They are there to improve the app.
They never judge or profile a person's finances.

**Non-goals.** No amounts, balances, notes, names, categories or record ids ever leave the phone
for analytics. No session replay, no autocapture, no screenshots, no user profiles, no
advertising, and no machine-learning classification of users.

---

## 1. How it works

```
screens, hooks ──► track('expense_created', {...})          src/services/analytics/index.ts
                        │
                        ▼
                  consent gate: nothing unless the user opted in on this phone
                        │
                        ▼
                  allowlist: event must be in the catalogue; each property must be
                  listed for it and hold a valid value; everything else is dropped
                        │
                        ▼
                  provider adapter (PostHog)                analytics.posthog.ts
```

| File | Role |
|---|---|
| `services/analytics/analytics.schema.ts` | The catalogue: every event, its allowed properties and their value sets; prohibited keys |
| `services/analytics/analytics.sanitize.ts` | Validates an event against the catalogue; turns router segments into a route template |
| `services/analytics/analytics.service.ts` | Consent state, `track`, `trackScreen`, `initAnalytics`, `flushAnalytics` |
| `services/analytics/analytics.posthog.ts` | The only file that imports the SDK |
| `hooks/useAnalyticsLifecycle.ts` | Root layout: loads the choice, `app_opened`, screen views, flush on background |
| `hooks/useAnalyticsConsent.ts` | The switch's state, shared by the set-up and Preferences |

Rules the code keeps:

- **Fire-and-forget.** `track` is synchronous, wrapped in `try/catch`, and never awaited. If
  analytics fails, the expense is still saved (tested).
- **Outcome, not intention.** `*_created` is sent after the service call resolves; the catch
  sends `*_creation_failed`. A failed reload *after* a good save is not counted as a failure.
- **No duplicates from rendering.** Events are sent from handlers, never from render. Screen
  views are sent from an effect keyed on the route template and de-duplicated against the last
  one sent. `app_opened` is sent once per launch, then once per return from the background.
- **The app's own writes are not user actions.** `RecurringAutoLogger` and other background
  writers call the services directly and send nothing.
- **Shared infra.** `services/analytics` imports nothing from features. Features import it like
  any other shared service, so the cross-feature graph is unchanged.

## 2. Provider: PostHog (EU cloud)

Chosen after the audit (2026-10-29). The app had no analytics, logging or crash reporting.

- It covers funnels, retention, trends and breakdowns by `$app_version` without a backend of
  our own. A Supabase events table would have needed hand-written SQL for each of those.
- Its React Native SDK lets every automatic collection be turned off, supports opt-in
  (`defaultOptIn: false`) and anonymous-only events (`personProfiles: 'never'`), and keeps a
  bounded queue.
- The EU region keeps data in the EU. The free tier covers this app's volume.

Package: `posthog-react-native@4.81.0` (pinned exactly, released 2026-10-10), plus
`expo-application` so `$app_version` and `$app_build` match the store build. `expo-device` is
deliberately **not** installed, so device model and device name are never read.

**Sentry was considered separately and deferred.** Crash reporting is a different processor with
its own disclosure, and none of the analytics questions need it. PostHog's own error
autocapture is off.

### What the SDK sends with each event

| Sent | Not sent |
|---|---|
| Our allowlisted properties + `app_language` | Device name, model, manufacturer (stripped in `keepReleaseContext`) |
| `$app_version`, `$app_build`, `$app_name`, `$app_namespace` | Locale, timezone (stripped) |
| `$os_name`, `$os_version`, `$device_type`, `$is_emulator` | GeoIP country/city (`disableGeoip: true`) |
| A random anonymous `distinct_id`, `$session_id`, timestamp, `$lib`/`$lib_version` | Screens, touches, lifecycle, errors, replay (all automatic capture off) |

The PostHog server sees the phone's IP address as part of the HTTPS request. Turn on **Discard
client IP data** in the project settings (§3) so it is not stored.

### Queue and delivery

The SDK keeps its queue on disk through `expo-file-system`. It holds at most **200** events,
sends in batches every **30 s** or **20 events**, retries a request twice, and flushes when the
app goes to the background. When the queue is full offline, the oldest events are dropped. The
queue only ever holds allowlisted properties. Opting out empties it.

## 3. Setup

1. Create a PostHog account at **eu.posthog.com**, then a project *Finance Gatekeeper*.
   Optionally create a second project *Finance Gatekeeper dev* for test builds.
2. In **Project settings**:
   - Autocapture, heatmaps, web vitals, session replay and surveys: **off**.
   - **Discard client IP data: on**.
   - Data retention: **12 months**. The privacy policy promises this, so change both together.
   - Turn on two-factor authentication for every member. The dashboard is only protected by
     PostHog's login. Nothing is exposed in the app.
3. Copy the **project API key** (`phc_…`). It is a public, write-only key made to ship inside
   apps, so it is safe in the bundle. Never put a *personal* API key in the app.
4. Environment variables:

   | Variable | Required | Value |
   |---|---|---|
   | `EXPO_PUBLIC_POSTHOG_KEY` | yes, to send anything | the project API key |
   | `EXPO_PUBLIC_POSTHOG_HOST` | no | defaults to `https://eu.i.posthog.com` |

   - **Local:** add the key to `.env` only when you want to see events. With no key, the
     provider is never created and nothing is sent, even after an opt-in.
   - **EAS builds:** `.env` is git-ignored and not uploaded, so set the key per environment:
     `npx eas-cli env:create --name EXPO_PUBLIC_POSTHOG_KEY --value phc_… --environment production --visibility plaintext`
     (repeat for `preview` with the dev project's key).
5. Make a **new native build**. `expo-application` is a native module, so an OTA update is not
   enough.

## 4. Consent and privacy

- **Off by default (opt-in).** No SDK object is created and nothing is fetched until the user
  turns on *Help improve the app* (*Aider à améliorer l'application*). The switch is on the
  set-up's first step and in **Preferences**.
- The choice is stored on this phone only (`ui_preferences.analytics_consent`:
  `granted`/`denied`; absent = not asked). It is never synced, so each install asks for itself.
- **Withdrawal** (switch off) takes effect at once: no new events are queued, the queued events
  are discarded rather than flushed, and the anonymous id is forgotten, so a later opt-in starts
  a new, unlinked id.
- **Identity.** The app never calls `identify`. Events are anonymous and person profiles are
  disabled. Signing in to cloud backup does not link analytics to the Supabase account or to the
  email address.
- **Essential vs optional.** Nothing essential is sent to an analytics service. Cloud backup
  (Supabase) is a separate feature with its own sign-in. There is no crash reporting.

### Privacy policy and Play Data safety (must ship with the build)

`docs/legal/privacy-policy.md` has an updated draft (*Optional usage analytics*). Publish it to
the legal site **before** the build that contains analytics. Update the Play Console **Data
safety** form at the same time:

| Question | Answer |
|---|---|
| Data collected → **App activity → App interactions** | Yes. Optional (users can choose). Purpose: Analytics. Not shared. |
| **App info and performance → Diagnostics** | Yes, only the save-failure codes (`failure_reason_code`). Optional. Purpose: Analytics. |
| **Device or other IDs** | Yes: a random analytics ID, generated by the app, reset on opt-out. Optional. Purpose: Analytics. |
| Financial info, personal info, location, messages | **Not** collected by analytics (financial info is still declared for cloud backup as before) |
| Encrypted in transit | Yes (HTTPS) |
| Users can request deletion | Yes (turn the switch off; email for deletion of past events) |
| Processor | PostHog Inc. (EU region) |

## 5. Event catalogue

Every event also carries `app_language` (`fr`/`en`) plus the SDK context in §2. *Attempt* means
the user tried something. *Outcome* means the app confirmed the result.

| Event | Meaning and trigger | Kind | Properties | Question it answers | Where |
|---|---|---|---|---|---|
| `app_opened` | App launched (once per process), or returned from the background | outcome | `trigger`: `launch`/`foreground` | Active users, open frequency | root layout |
| `screen_viewed` (sent as PostHog `$screen`) | The route changed | outcome | `screen_name`: route template, e.g. `/budget/category/[id]` | Feature discovery and reach. Budget, Reports, category detail, My path, weekly report and net worth views are read from here | every route |
| `analytics_enabled` | The user turned the switch on | outcome | `entry_point`: `onboarding`/`settings` | Opt-in rate by place | set-up, Preferences |
| `onboarding_step_completed` | Set-up step finished (intro *Start*, wallets saved, reminder answered) | outcome | `workflow_step`: `intro`/`wallets`/`reminder` | Set-up funnel | set-up |
| `onboarding_completed` | Set-up finished from the last step | outcome | `reminder`: `on`/`blocked`/`later` | Completion; reminder uptake | set-up |
| `onboarding_skipped` | *Skip set-up* tapped | outcome | `workflow_step` where it was tapped | Where people bail out | set-up |
| `expense_validation_failed` | Save tapped with a missing field | attempt | `entry_point`, `invalid_field`: `amount`/`category`/`amount_and_category` | Form friction | log screen, add sheet |
| `expense_created` | Expense saved (service resolved) | outcome | `entry_point`: `log_screen`/`add_sheet`/`quick_add`; `marked_unplanned`, `linked_event`, `has_subcategory` (booleans); `operation_duration_ms` | Core-loop usage; entry point mix; adoption of imprévus, events, subcategories | log screen, add sheet, quick add |
| `expense_creation_failed` | Expense save threw | outcome | `entry_point`, `failure_reason_code`: `save_error` | Save reliability | same |
| `expense_edited` / `expense_deleted` | Edit / delete saved | outcome | none | Correction rate | expense detail |
| `income_validation_failed` | Save tapped with a missing field | attempt | `entry_point`, `invalid_field`: `amount`/`source`/`amount_and_source` | Form friction | income log, add sheet |
| `income_created` | Income saved | outcome | `entry_point`: `log_screen`/`add_sheet`; `operation_duration_ms` | Income logging | same |
| `income_creation_failed` | Income save threw | outcome | `entry_point`, `failure_reason_code` | Reliability | same |
| `income_edited` / `income_deleted` | Edit / delete saved | outcome | none | Correction rate | income detail |
| `debt_created` | Debt saved | outcome | `has_total_to_repay`, `has_instalments`, `has_due_date` (booleans); `operation_duration_ms` | Debt feature and terms adoption | debt form |
| `debt_creation_failed` | Debt save threw | outcome | `failure_reason_code` | Reliability | debt form |
| `debt_updated` | Debt edit saved | outcome | none | | debt detail |
| `debt_deleted` | Debt deleted | outcome | `entry_point`: `list`/`detail` | | debt list, detail |
| `debt_repayment_recorded` | A repayment landed | outcome | `action_type`: `payment`/`instalment`/`settle` | Repayment flows in use | debt list, detail |
| `budget_adjustment_completed` | Plan or envelope saved | outcome | `entry_point`: `planner`/`category_detail`; `action_type`: `save_plan`/`set_envelope`/`remove_envelope`/`cover_from` | The Plan step in practice | planner, category detail |
| `feature_action_completed` | A write in a secondary feature landed (via `trackedWrite`) | outcome | `feature_name`: `wallet`/`balance_check`/`transfer`/`goal`/`tontine`/`tontine_payment`/`planned_list`/`planned_item`/`event`/`income_source`; `action_type`: `create`/`edit`/`delete`/`hide`/`pay`/`payout`/`buy`/`unbuy`/`postpone`/`reschedule` | Adoption and use of wallets, transfers, goals, tontines, planned purchases, events, income sources (VS-91; never the name). A ticked planned item is `planned_item`/`buy`, never `expense_created` | wallet form and detail, transfer form, goal form, tontine form and detail, planned lists, events, income source picker and manage screen |
| `operation_failed` | An edit, delete, repayment, budget write or secondary-feature write threw | outcome | `feature_name`: `expense`/`income`/`debt`/`budget` or any `feature_action_completed` feature; `action_type`: `edit`/`delete`/`repay`/`adjust` or any `feature_action_completed` action; `failure_reason_code` | Reliability outside creation | as above |
| `feature_entry_point_selected` | A drawer row was tapped | attempt | `feature_name`: drawer key (`accounts`, `goals`, `debts`, `tontines`, `planned`, `events`, `categories`, `preferences`, `backupRestore`, `exportImport`, `feedback`, `privacy`); `entry_point`: `drawer` | Discovery of drawer-only features | drawer |
| `feedback_started` | *Feedback* opened the mail app | attempt | `entry_point`: `drawer` | Feedback intent (sending cannot be seen) | drawer |

**Not implemented, on purpose.** These were left out because the workflow does not exist or the
signal would be unreliable:

- `allocation_*`: income allocation was parked in VS-34; the budget planner is tracked instead.
- `help_content_viewed`: there is no help content.
- `feedback_submitted`: feedback is a `mailto:` link, so the app can't see a sent message.
- `onboarding_started` and `onboarding_abandoned`: under opt-in, nothing can be sent before the
  switch on step 1.
- `session_started`/`session_ended`: use PostHog's `$session_id`. A session ends after 30
  minutes without events.
- `budget_adjustment_started`: opening the planner is a screen view.

## 6. Metrics and funnels

**Denominators.** Adoption and funnel figures count **unique users** (`distinct_id`). Success
rates count **events**. Every figure is only for users who opted in (see §9).

| Metric | Definition (PostHog insight) |
|---|---|
| Weekly active users | Unique users with `app_opened`, by week |
| Feature adoption | % of weekly active users with ≥1 `screen_viewed` where `screen_name` = the feature's route (or ≥1 of its outcome event), by week |
| Least-discovered features | Drawer features ranked by unique users with `feature_entry_point_selected` (low = undiscovered) |
| Expense save success rate | `expense_created` ÷ (`expense_created` + `expense_creation_failed`), by day and by `$app_version` |
| Validation friction | `expense_validation_failed` ÷ (`expense_created` + `expense_validation_failed`), by `entry_point` |
| Save duration | p50 / p95 of `operation_duration_ms` on `expense_created`, by `$app_version` |
| Logging retention | Retention insight: start event `analytics_enabled`, return event `expense_created`, weekly, 8 weeks |
| Version mix | Unique users with `app_opened` broken down by `$app_version` |

**Funnels** (strict order, one count per user, conversion window as given):

1. **Set-up** (window 1 day): `analytics_enabled` (onboarding) → step `intro` → step `wallets` →
   `onboarding_completed`. Break down `onboarding_skipped` by `workflow_step` to see where people
   leave.
2. **Observe → Plan** (window 30 days): `analytics_enabled` → `expense_created` →
   `screen_viewed` `/reports` → `budget_adjustment_completed`. Not finishing within the window
   doesn't mean the user failed. The app lets people move at their own pace, so read this as
   *time to plan*, using the funnel's time-to-convert.
3. **Logging habit** (window 7 days): `expense_created` on 3 or more distinct days. Use a
   Stickiness insight.

## 7. Anomaly rules

These are deterministic rules. Set them up as PostHog insights with **alerts**. A rule only
fires when the sample is large enough; with small numbers, look at the raw counts instead.

| Rule | Fires when | Minimum sample |
|---|---|---|
| Save failures up | Expense save success rate < 98 % for a day, or 2 points below the 4-week median | ≥ 30 save attempts in the day |
| Set-up completion down | Set-up funnel conversion for a week ≥ 10 points below the previous 4-week average | ≥ 20 users entering |
| Adoption drop after release | A feature's adoption among users on the newest `$app_version` ≥ 30 % lower (relative) than on the previous version, after 7 days | ≥ 30 users on each version |
| Repeated validation failures | Validation friction > 25 % for an `entry_point` over a week | ≥ 50 attempts |
| Slower saves | p95 `operation_duration_ms` doubles against the previous version | ≥ 100 saves per version |
| Plan step down | `budget_adjustment_completed` users ÷ users with `screen_viewed` `/budget/plan` drops ≥ 15 points | ≥ 20 users |

When a rule fires, write the finding up in this format. A rule firing is a reason to look, not a
diagnosis:

> **Observation:** what moved, by how much, over which window, on which versions.
> **Possible explanations:** UI change, technical fault, change in who is using it (new testers,
> another region), seasonality (month start), data gaps.
> **Evidence:** failure counts, `$app_version` and `$os_version` breakdowns, the release notes
> for that version.
> **Next step:** e.g. compare `operation_failed` by `feature_name`; reproduce on the version.
> **Confidence:** low / medium / high, and why (sample size, competing explanations).

Never label an individual user (confused, irresponsible, etc.). Every rule works on aggregates.

## 8. Comparing releases

Break each metric in §6 down by `$app_version`.

- Each version has a different mix of users. New installs land on the newest version, and an
  early closed test is mostly testers.
- With fewer than ~30 users per version, report counts, not percentages.
- One improved metric does not make a release good. Read completion, failures, duration and
  retention together.
- A difference between versions is a correlation. Treat it as a cause only if the change and the
  mechanism line up and nothing else changed (§7 format).

## 9. Known limitations

- **Opt-in bias.** Only people who chose to share are counted, and they are probably the more
  engaged ones. Read rates as "among sharers", never as all users.
- **One device = one user.** A reinstall, a cleared app or an opt-out/opt-in starts a new id, and
  two phones count as two users. That is the price of never linking to the cloud account.
- The set-up funnel only covers people who turned the switch on at step 1. Users who opt in later
  in Preferences never send set-up events.
- Events in the first moments of a cold start, before the saved choice loads, are dropped. The
  splash covers this, so no user action is lost.
- Wallets, transfers, goals, tontines, planned purchases and events send one generic
  `feature_action_completed` per write, so they show adoption and failure rates but no
  validation detail. The wallet balances entered during set-up count as the set-up's `wallets`
  step, not as balance checks.
- No crash reporting (Sentry deferred, §2).
- **Not yet verified on a device or against a live PostHog project.** Everything is covered by
  Jest tests with the SDK mocked.
- There is no product-health dashboard yet. Build it in PostHog (§10). No in-app dashboard should
  be built: it would need its own access control.

## 10. Inspecting events

- **Live:** PostHog → *Activity* (live events). Use a dev build with the dev project's key, turn
  the switch on, log an expense, and `expense_created` should appear within 30 s, or at once when
  the app goes to the background.
- **Check the payload:** open an event and confirm that its properties are only those in §5,
  plus `$app_*`, `$os_*`, `$device_type`, `$is_emulator`, `$lib*`, `$session_id` and
  `$screen_name`.
- **Product health dashboard** (to build in PostHog): weekly active users, version mix, feature
  adoption, set-up funnel, expense save success rate, `operation_failed` by `feature_name`, save
  duration by version, logging retention, and the §7 alerts.

## 11. Adding an event

1. Add it to `ANALYTICS_EVENTS` in `analytics.schema.ts`, in snake_case, with only the properties
   you need. Prefer enums and booleans. A string property must be an `oneOf([...])` set, never
   free text.
2. Send it where the outcome is known:

   ```ts
   import { elapsedSince, track } from '@/services/analytics';

   const startedAt = Date.now();
   try {
     const id = await expenseService.createExpense(input);
     track('expense_created', { entry_point: 'add_sheet', operation_duration_ms: elapsedSince(startedAt) });
     return id;
   } catch (e) {
     track('expense_creation_failed', { entry_point: 'add_sheet', failure_reason_code: 'save_error' });
     throw e;
   }
   ```

   For a write in a secondary feature, wrap it instead of adding an event:
   `await trackedWrite('goal', 'create', () => createGoal(input))`. It sends
   `feature_action_completed` once the write resolves, or `operation_failed` and rethrows. A new
   feature or action goes into `TRACKED_FEATURES` / `TRACKED_ACTIONS` first.
3. Add a row to §5 and, if it is a key workflow, a metric or funnel step to §6.
4. Test it with the recording provider: `setAnalyticsProviderFactoryForTests(() => fake)` from
   `services/analytics/__fixtures__/fakeAnalyticsProvider` (see
   `expenses/__tests__/expenses.analytics.test.ts`).

### Prohibited properties

Never add, whatever the event, any of the following:

- Amounts, totals, balances or prices
- Notes, descriptions or anything typed (including search text)
- Category or subcategory names or ids
- Wallet, account, goal, debt, person, event or tontine names or ids
- Email, phone, PIN, password, tokens, Supabase user id
- URLs or route params (send the template, `/expenses/[id]`)
- Error messages (they can contain data; send a `failure_reason_code`)
- Whole objects, rows or state

`PROHIBITED_PROPERTY_KEYS` and `PROHIBITED_KEY_FRAGMENTS` in the schema list these, and a test
fails if any event allows one.

## 12. Testing

```
npx jest src/services/analytics src/hooks/__tests__/useAnalyticsLifecycle.test.ts \
  src/features/finance/expenses/__tests__/expenses.analytics.test.ts \
  src/features/finance/onboarding/__tests__/OnboardingScreen.analytics.test.tsx \
  src/features/finance/auth/__tests__/SettingsScreen.analytics.test.tsx \
  src/features/finance/planned/__tests__/planned.analytics.test.ts
```

`jest.setup.ts` replaces `posthog-react-native` with an inert client, so no test can reach the
network.
