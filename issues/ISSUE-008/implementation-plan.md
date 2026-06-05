# ISSUE-008 — Daily Reminder, Zero-Day Confirmation & App Mode

**Maps to:** KANBAN VS-08
**Priority:** High
**Blocked by:** VS-03 (✅ Done)
**Soft dependency:** VS-02 PIN Auth (🔲 Backlog) — see Design Decision #1. VS-08 must create the
`users`/app-settings storage and a minimal `auth.service.ts` that VS-02 will later extend with PIN logic.

---

## Problem Statement

The app only captures spending if the user remembers to open it and log. Two gaps lose data:

1. **No nudge.** Nothing reminds the user to log at the end of the day, so days silently go un-recorded and the budget drifts from reality.
2. **A blank day is ambiguous.** "No expenses today" and "I forgot to log today" look identical in the data. Without an explicit *zero-day confirmation*, reports can't tell a genuinely frugal day from a missed one.

Separately, the app is too much at once for a brand-new user. **App mode** solves onboarding:

- **Learning mode** (the default for month 1): only the logging surfaces are visible — no budget/allocation machinery. The user just builds the habit of recording income and expenses.
- **Control mode**: the full app (budgets, allocation, funds, projects). After ~30 days the app suggests switching.

Three constraints shape the design:

- **The daily reminder time is user-configurable** (default 21:00) and must survive a reschedule cleanly — changing it cancels the previously scheduled notification before booking the new one.
- **Zero-day is decided in-app on open, not by the OS at fire time.** A local OS notification can't run a DB query when it fires. So the 21:00 notification is an unconditional nudge; the *decision* to show the "Did you spend nothing today?" prompt happens when the app is next opened and finds no activity for today.
- **App-mode visibility gating happens at the routing layer, never via feature→feature imports.** `app/` legitimately imports features; features must not import each other for this. See Design Decision #2.

## User Stories

- **As the builder,** I get a local notification at 21:00 reminding me to log the day's spending. I can change that time (or turn notifications off) in Settings.
- **As the builder,** when I open the app after the reminder time and I've logged nothing and not confirmed a zero-day, I see a modal: "Did you spend nothing today?" — **Confirm** records a zero-day; **Let me log** takes me to the expense form.
- **As the builder,** once I've confirmed a zero-day (or logged anything) for today, the prompt does not reappear that day.
- **As the builder,** on first run the app is in **learning mode** and the Budget tab/allocation flow is hidden — I only see logging features.
- **As the builder,** after my first ~30 days the app suggests switching to **control mode**, and I can flip the toggle in Settings to reveal the full app.

## Scope

Each bullet maps to a concrete file. Implementation order is top-to-bottom (tests precede implementation per TDD).

### Database

- `src/services/migrations/008_create_users_table.ts` — `users` table (single-row app/user record):
  `id INTEGER PRIMARY KEY AUTOINCREMENT, pin_hash TEXT, app_mode TEXT NOT NULL DEFAULT 'learning' CHECK(app_mode IN ('learning','control')), reminder_time TEXT NOT NULL DEFAULT '21:00', notifications_enabled INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL`.
  `pin_hash` is nullable now and stays unused until VS-02 populates it (Design Decision #1).
- `src/services/migrations/009_create_zero_days_table.ts` — `zero_days` table:
  `id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE, confirmed_at TEXT NOT NULL`. The `UNIQUE(date)` constraint makes `confirmZeroDay` idempotent (one zero-day per calendar day).
- `src/services/migrations/index.ts` — **modified** to register migrations 8 and 9.

### Types

New file `src/features/finance/auth/auth.types.ts`:

- `AppMode = 'learning' | 'control'`.
- `AppSettings { appMode: AppMode; reminderTime: string; notificationsEnabled: boolean; createdAt: string }`.
- `AppSettingsPatch = Partial<Pick<AppSettings, 'appMode' | 'reminderTime' | 'notificationsEnabled'>>`.

Added to `src/features/finance/expenses/expenses.types.ts`:

- `ZeroDay { id: number; date: string; confirmedAt: string }`.
- `DayActivityStatus { hasExpenses: boolean; zeroDayConfirmed: boolean }`.

Extended `src/notifications/notifications.types.ts`:

- Add an optional repeating-schedule descriptor to support a daily-at-HH:mm trigger, e.g.
  `NotificationSchedule { hour: number; minute: number; repeats: boolean }` and an optional
  `schedule?: NotificationSchedule` field on `NotificationPayload` (kept alongside the existing
  `scheduledAt?` for one-shot notifications).

### Shared Infrastructure — `src/notifications/`

- `notifications.service.ts` — **replaces the VS-01 stub** with a real thin wrapper over Expo Notifications (read the v55 docs per `AGENTS.md` before writing): `requestPermissions(): Promise<boolean>`, `scheduleNotification(payload): Promise<string>` (returns the OS identifier; honors `payload.schedule` for repeating daily triggers and `payload.scheduledAt` for one-shots), `cancelNotification(id): Promise<void>`, `getScheduledNotifications()`. No domain logic.
- `notifications.config.ts` — **new**: `DEFAULT_REMINDER_TIME = '21:00'`, the Android channel descriptor, and default `MESSAGES` for `dailyReminder` and `zeroDay` (title + body).
- `notifications/triggers/dailyReminder.ts` — **new**, pure: `buildDailyReminder(time: string): NotificationPayload` — parses `HH:mm`, returns a payload (`type: 'dailyReminder'`, messages from config, `schedule: { hour, minute, repeats: true }`). Throws on malformed time. No DB.
- `notifications/triggers/zeroDayCheck.ts` — **new**, pure: `shouldTriggerZeroDay(input: { hasExpensesToday: boolean; zeroDayConfirmed: boolean }): boolean` (`true` only when both are false) and `buildZeroDayNotification(): NotificationPayload` (`type: 'zeroDayCheck'`). No DB.

### Auth feature (minimal) — `src/features/finance/auth/`

- `auth.service.ts` — **new**. App-settings + mode only (no PIN yet):
  - `getAppSettings(): Promise<AppSettings>` — reads the single `users` row, creating a default row (`learning`, `21:00`, enabled, `created_at = now`) on first call.
  - `setAppMode(mode: AppMode): Promise<void>`.
  - `setReminderTime(time: string): Promise<void>` — validates `^([01]\d|2[0-3]):[0-5]\d$`.
  - `setNotificationsEnabled(enabled: boolean): Promise<void>`.
  - `isMonth1Complete(nowISO?: string): Promise<boolean>` — `now - created_at >= 30 days`.
- `auth.hooks.ts` — **new**: `useAppSettings()` → `{ settings, loading, refresh, setMode, setReminderTime, setNotificationsEnabled, isMonth1Complete }`. Mutations re-fetch.
- `AppModeProvider.tsx` — **new**. React context provider (per the auth CLAUDE.md "auth state in a context wrapping the app") exposing `useAppMode(): AppMode`. Used by the tab layout to gate visibility. Loads settings once; defaults to `learning` until loaded.
- `SettingsScreen.tsx` — **new**. Sections: **App Mode** (learning/control toggle; shows a "You've used the app for a month — switch to Control mode?" suggestion when `isMonth1Complete && appMode === 'learning'`), **Reminder time** (time input, persisted via `setReminderTime`), **Notifications** (on/off switch). On any reminder/notification change it reschedules the daily reminder via `notifications.service` + `buildDailyReminder` (shared infra — allowed; no cross-feature import).
- `DailyReminderScheduler.tsx` — **new**, root-mounted (mirrors `RecurringAutoLogger`). On mount: if `notificationsEnabled`, cancel any prior daily reminder and schedule a fresh one from the saved `reminderTime`; otherwise cancel. Errors swallowed to console. Reads only its own `auth` settings + `notifications` infra.

### Expenses feature — additions

- `expenses.service.ts` — **modified**: `confirmZeroDay(dateISO?): Promise<void>` (INSERT OR IGNORE into `zero_days`, default today), `isZeroDayConfirmed(dateISO?): Promise<boolean>`, `hasExpensesOn(dateISO?): Promise<boolean>` (count of expenses with `date = day`), `getDayActivityStatus(dateISO?): Promise<DayActivityStatus>` (convenience combining the two).
- `expenses.hooks.ts` — **modified**: `useZeroDay()` → `{ status, loading, refresh, confirm }`.
- `ZeroDayPrompt.tsx` — **new**. Modal: "Did you spend nothing today?" with **Confirm** (calls `useZeroDay().confirm()`) and **Let me log** (navigates to `/expenses/log`). Reuses the shared `Modal`/`Button` primitives.
- `ZeroDayGate.tsx` — **new**, root-mounted (mirrors `RecurringAutoLogger`). Props: `reminderTime`, `notificationsEnabled` (injected by the root layout — see Design Decision #2). On mount, if notifications are enabled, it's past the reminder time, and `getDayActivityStatus()` shows no expenses **and** no confirmation, it renders `<ZeroDayPrompt />`. Renders `children` either way. Imports only `expenses.service` + the `zeroDayCheck` trigger — no auth import.

### Routes / Layout

- `src/app/settings/index.tsx` — **new**, thin: renders `<SettingsScreen />` (auth).
- `src/app/_layout.tsx` — **modified**. Compose providers/wrappers: `<AppModeProvider>` (for tab gating) wrapping the existing `<RecurringAutoLogger>`, plus `<DailyReminderScheduler />` and `<ZeroDayGate reminderTime=… notificationsEnabled=…>` around `<Stack />`. The layout reads settings via `useAppSettings()` (app → auth is the allowed direction) and passes the reminder props down into the expenses `ZeroDayGate`.
- `src/app/(tabs)/_layout.tsx` — **modified**. Reads `useAppMode()` and hides the **Budget** tab in learning mode via `options={{ href: appMode === 'control' ? undefined : null }}` (keeps the route registered, removes it from the tab bar). App-level consumption of an auth hook — allowed.

### Navigation

- `src/features/finance/expenses/TransactionsScreen.tsx` — **modified**. Add a "Settings" link to the existing footer (alongside Quick Add / Recurring), navigating to `/settings` via `router.push` (a route string, not an import — no cross-feature violation).

## TDD Anchors

Failing tests to write first; the slice is done when they all pass.

1. **`auth.service.test.ts`** — `src/features/finance/auth/__tests__/auth.service.test.ts`:
   - `getAppSettings` creates and returns a default row (`learning`, `21:00`, `notificationsEnabled: true`) on first call; a second call returns the same row (no duplicate).
   - `setAppMode('control')` persists and survives a re-read; CHECK rejects an invalid mode.
   - `setReminderTime` accepts `'07:30'`/`'21:00'`, rejects `'9pm'`, `'24:00'`, `'12:60'`.
   - `setNotificationsEnabled(false)` toggles and survives a re-read.
   - `isMonth1Complete` is `false` when `created_at` is 10 days ago, `true` when 31 days ago (inject `nowISO`).

2. **`dailyReminder.test.ts`** — `src/notifications/triggers/__tests__/dailyReminder.test.ts`:
   - `buildDailyReminder('21:00')` returns `type: 'dailyReminder'`, `schedule: { hour: 21, minute: 0, repeats: true }`, and non-empty title/body.
   - `buildDailyReminder('07:05')` → `{ hour: 7, minute: 5 }`.
   - Throws on `'9pm'` and `'24:00'`.

3. **`zeroDayCheck.test.ts`** — `src/notifications/triggers/__tests__/zeroDayCheck.test.ts`:
   - `shouldTriggerZeroDay` is `true` only when `hasExpensesToday` and `zeroDayConfirmed` are both `false`; `false` for the other three combinations.
   - `buildZeroDayNotification()` returns `type: 'zeroDayCheck'` with non-empty messages.

4. **`expenses.service.test.ts`** (extended):
   - `confirmZeroDay('2026-06-05')` then `isZeroDayConfirmed('2026-06-05')` is `true`; a different date is `false`.
   - `confirmZeroDay` called twice for the same date inserts one row (idempotent via UNIQUE).
   - `hasExpensesOn` is `true` for a date with a logged expense, `false` otherwise.
   - `getDayActivityStatus` reflects both flags correctly.

5. **`notifications.service.test.ts`** — with `expo-notifications` mocked: `scheduleNotification` returns the mocked identifier and forwards a repeating trigger for a payload carrying `schedule`; `cancelNotification(id)` calls the cancel API with that id; `requestPermissions` maps the granted status to a boolean.

6. **`ZeroDayPrompt.test.tsx`**:
   - Renders the question text and both buttons.
   - **Confirm** calls `confirmZeroDay` once.
   - **Let me log** navigates to `/expenses/log`.

7. **`ZeroDayGate.test.tsx`**:
   - Shows the prompt when notifications enabled, current time is past `reminderTime`, and the day has no expenses and no confirmation.
   - Hidden when the day already has an expense.
   - Hidden when a zero-day is already confirmed.
   - Hidden when `notificationsEnabled` is `false`.
   - Always renders `children`.

8. **`SettingsScreen.test.tsx`**:
   - Renders the mode toggle, reminder-time input, and notifications switch seeded from `getAppSettings`.
   - Changing the reminder time calls `setReminderTime` and reschedules (asserts `scheduleNotification` invoked).
   - Toggling mode calls `setAppMode`.
   - Shows the "switch to Control mode" suggestion only when `isMonth1Complete` and currently in learning mode.

9. **`AppModeProvider.test.tsx`** (covers tab-gating logic at the unit level): `useAppMode()` returns `learning` before load and the persisted value after; a consumer re-renders on mode change.

## Acceptance Check (Done When)

- A local notification is scheduled for 21:00 by default; changing the time in Settings cancels the old one and schedules a new one; turning notifications off cancels it.
- Opening the app after the reminder time with nothing logged and no zero-day confirmed shows the "Did you spend nothing today?" modal. **Confirm** records a zero-day and the modal does not return that day. **Let me log** opens the expense form.
- Logging any expense for today suppresses the zero-day prompt.
- On first run the app is in learning mode and the **Budget** tab is not shown. Toggling to control mode in Settings reveals it.
- After 30 days the Settings screen surfaces the "switch to Control mode" suggestion.
- `npm test` — all new/extended test files pass; the full suite stays green.

## Design Decisions

> **⚠️ Two decisions below need your sign-off at the approval checkpoint — they shape files VS-02 will later touch and how app-mode gating is wired. Veto either before I implement.**

- **(1) VS-08 creates the `users` table + a minimal `auth.service.ts`, front-running VS-02.**
  The KANBAN puts `app_mode` on `auth.service.ts`/the `users` table, and the auth `CLAUDE.md` agrees — but VS-02 (PIN Auth), which would normally create them, is still Backlog and is *not* a declared blocker of VS-08. So VS-08 creates the `users` table with `pin_hash` **nullable and unused**, plus an `auth.service.ts` that implements only app-mode + reminder settings. VS-02 later adds PIN hashing/verification to the same file and populates `pin_hash` (no schema change needed; the column already exists).
  *Rejected alt:* a neutral `app_settings` key-value table owned by no feature. Why rejected: it contradicts two pieces of checked-in documentation (KANBAN + auth CLAUDE.md) that name the `users` table explicitly, and would force a migration when VS-02 lands. *If you prefer the KV table, say so and I'll switch.*

- **(2) App-mode visibility is gated at the routing layer, not by feature→feature imports.**
  "Learning mode hides budget/allocation" needs many surfaces to read the mode, but `expenses`/`budget` reading `auth` is **not** in the approved cross-feature list. Since `app/` is *allowed* to import features, the gate lives there: `(tabs)/_layout.tsx` reads `useAppMode()` and hides the Budget tab; the root layout injects reminder settings into the expenses `ZeroDayGate` as props. No feature imports another feature.
  *Rejected alt:* add `expenses → auth` / `budget → auth` to the approved dependency table. Why rejected: amending the architecture's dependency table is a heavier change than necessary; routing-layer gating satisfies the "Done when" without loosening the rules.

- **Zero-day is an in-app gate on app open, not an OS-fired DB check.** The 21:00 notification is an unconditional nudge; `ZeroDayGate` decides whether to show the prompt when the app next opens (a scheduled OS notification can't query SQLite at fire time). *Rejected alt:* a background task that queries the DB at 21:00 — out of proportion for a single-user local app and unreliable on mobile OSes.

- **`confirmZeroDay` is idempotent via a `UNIQUE(date)` constraint + `INSERT OR IGNORE`.** A double-tap or a re-open the same day can't create duplicate zero-day rows. *Rejected alt:* check-then-insert in JS — racy and more code.

- **Auto-scheduling and the zero-day gate run from root-mounted wrapper components** (`DailyReminderScheduler`, `ZeroDayGate`), mirroring the existing `RecurringAutoLogger`. Guarantees the reminder is current and the gate is evaluated before any screen renders, regardless of which tab the user lands on. Errors are swallowed (console) so a notification/DB hiccup never gates the user out.

- **The daily reminder reschedules by cancel-then-schedule, not in-place edit.** Expo identifies scheduled notifications by id; the cleanest correct behavior on a time change is to cancel the previous identifier and book a new one. Avoids duplicate reminders stacking up.

- **`reminder_time` is stored as an `HH:mm` string, validated by regex in the service.** Consistent with the project's "dates/times as ISO-ish strings" convention; the closed format is cheap to validate and parse in `buildDailyReminder`.

- **`isMonth1Complete` uses `created_at + 30 days`**, with `nowISO` injectable for deterministic tests. "Month 1" is approximated as 30 days — calendar-month math adds complexity with no product benefit here.

## Out of Scope (Deferred)

- **PIN entry, hashing, and the auth gate** → VS-02. VS-08 only lays the `users` table and the app-mode/settings half of `auth.service.ts`.
- **Foreground/background re-checks** via `hooks/useAppState.ts` — VS-08 evaluates the gate and reschedules on mount only; re-evaluating when the app returns from background can be added later.
- **Hiding allocation deep-links in learning mode** — VS-08 hides the Budget *tab*; directly navigating to `/budget/settings` or `/income/allocate` in learning mode is not blocked here.
- **Per-notification-type cancellation helpers** beyond what the daily reminder needs (e.g. over-budget, debt) → their owning slices (VS-12, VS-11).
- **Rich reminder copy / localization** — single hard-coded FCFA-context message set in `notifications.config.ts`.

## After This Slice

1. Run `/check-arch` to confirm no dependency-rule violations (special attention: no `expenses`/`budget` → `auth` imports; gating stays in `app/`).
2. Invoke the `code-reviewer` subagent on the branch diff. Address any `BLOCK` findings.
3. Mark VS-08 as `✅ Done` in `docs/KANBAN.md` with the test count and migration numbers (008, 009).
4. Delete `issues/ISSUE-008/` after on-device verification.
