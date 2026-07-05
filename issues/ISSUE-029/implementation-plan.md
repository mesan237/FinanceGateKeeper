# ISSUE-029 — Native Time Picker for Reminders

**Maps to:** KANBAN VS-29
**Priority:** Medium
**Blocked by:** VS-08 (Settings / reminder ✅ Done)
**Audit refs:** M4 — `docs/ux-audit/phase-3-polish.md`

---

## Problem Statement

The daily-reminder time is entered as **free text** in Settings. The field
([`SettingsScreen.tsx:147-153`](../../src/features/finance/auth/SettingsScreen.tsx#L147))
is a `TextInput` with placeholder `"HH:mm (e.g. 21:00)"`, and a wrong format
falls through to an error message ("Invalid time. Use HH:mm.",
[`SettingsScreen.tsx:75`](../../src/features/finance/auth/SettingsScreen.tsx#L75)).
A first-time user has to know the 24-hour `HH:mm` convention, can fat-finger an
invalid string, and only finds out after pressing Save. Every other
date/time entry in the app already uses a native picker via
[`DateField`](../../src/components/DateField.tsx) — the reminder is the last
free-text temporal field.

The fix is small and low-risk: a `TimeField` sibling to `DateField` (both wrap
`@react-native-community/datetimepicker`, already a dependency at `8.4.4`), and a
one-section swap in Settings. The picker can only produce a valid time, so the
format-error path disappears entirely.

## User Stories

- **As any user**, I set my reminder time by tapping a pill and spinning a native
  time picker — no typing, no `HH:mm` knowledge, no way to enter an invalid value.
- **As a returning user**, the reminder pill shows my currently-scheduled time and
  the picker opens seeded to it.

## Scope

### New shared component — `src/components/TimeField.tsx`

- A tappable pill (mirrors `DateField`'s structure exactly) that opens the native
  picker in `mode="time"`. Props: `value: string` (an `HH:mm` 24-hour string),
  `onChange: (hhmm: string) => void`, optional `accessibilityLabel`, `testID`.
- **Seed → picker:** parse `value` (`HH:mm`) into a `Date` (hours/minutes on an
  arbitrary calendar day); fall back to the current time when `value` is empty or
  malformed (mirrors `DateField`'s `isISO` guard at
  [`DateField.tsx:36-43`](../../src/components/DateField.tsx#L36)).
- **Pick → emit:** on a `set` event, format the picked `Date` back to
  `${HH}:${mm}` zero-padded and call `onChange`; a `dismissed` event emits nothing
  (mirrors [`DateField.tsx:45-52`](../../src/components/DateField.tsx#L45)).
- Label: render the `HH:mm` value on the pill (fallback `"Set time"` when empty).
  No new util needed — the stored string is already display-ready and matches the
  `Pill` shown in the section header.
- Architecture: lives in `components/`, importing only `@/components/*`, `@/theme`,
  `@/constants/*`, and the `datetimepicker` package — the identical import set
  `DateField` already uses. No feature import.

### Modify — `src/features/finance/auth/SettingsScreen.tsx`

- Replace the reminder `TextInput` + inline error `Typography`
  ([`:147-154`](../../src/features/finance/auth/SettingsScreen.tsx#L147)) with
  `<TimeField value={reminderInput} onChange={setReminderInput} testID="settings-reminder-time" accessibilityLabel="Reminder time" />`.
- Keep the existing "Save reminder" button
  ([`:155`](../../src/features/finance/auth/SettingsScreen.tsx#L155)) and the
  `saveReminder` handler's persist + reschedule
  (`setReminderTime` → `applyReminderSchedule`) unchanged — **Design Decision #1**.
- Remove the format-error path: the `catch` no longer needs the "Invalid time. Use
  HH:mm." branch, and the reminder `error` state / its `Typography` are dropped
  (the picker cannot produce an invalid value). If `error` is used only by the
  reminder section, remove the `useState`; if shared, leave it and just stop
  setting it here (confirm during implementation).
- `applyReminderSchedule` in [`reminder.ts`](../../src/features/finance/auth/reminder.ts)
  is **not touched** (it already takes an `HH:mm` string).

## Scope Bullet → File Map

| KANBAN Scope bullet | Concrete change |
| --- | --- |
| New `components/TimeField.tsx` (sibling to `DateField`, wrapping `@react-native-community/datetimepicker`), persisting the same `HH:mm` string | **new** `src/components/TimeField.tsx` |
| `SettingsScreen.tsx` — replace the free-text reminder `TextInput` + on-save validation with `TimeField`; `applyReminderSchedule` unchanged | modify `src/features/finance/auth/SettingsScreen.tsx` (swap input, drop format-error path; keep Save + `saveReminder`; `reminder.ts` untouched) |

## TDD Anchors → Test Files

| KANBAN TDD Anchor | Test file | Assertion |
| --- | --- | --- |
| `TimeField` emits `HH:mm` for a picked time and seeds from an `HH:mm` value | **new** `src/components/__tests__/TimeField.test.tsx` | Rendering with `value="21:00"` shows the `21:00` label; pressing the pill opens the picker seeded to 21:00; firing the picker's `onChange` with a `set` event + a `Date` at 07:05 calls `onChange('07:05')`; a `dismissed` event calls `onChange` never; empty `value` renders the fallback label and seeds the picker to "now". (Uses the global datetimepicker mock in `jest.setup.ts:38` that surfaces the picker as a `View` exposing its `onChange`/`value` props.) |
| Settings saves the picked time and reschedules; no format-error path remains | modify `src/features/finance/auth/__tests__/SettingsScreen.test.tsx` | Replace the two `settings-reminder-input` tests ([`:94`, `:100`](../../src/features/finance/auth/__tests__/SettingsScreen.test.tsx#L94)): the reminder section renders `settings-reminder-time` seeded from `settings.reminderTime` (`21:00`); driving the picker to `07:30` then pressing `settings-reminder-save` calls `setReminderTime('07:30')` and `applyReminderSchedule({ reminderTime: '07:30', notificationsEnabled: true })`; assert no "Invalid time" copy is reachable. |

## Acceptance Check (Done When)

1. **Native picker, no free text.** The Settings "Daily reminder" section shows a
   `TimeField` pill (seeded to the saved time) that opens the OS time picker; there
   is no `HH:mm` text input. → `SettingsScreen.test.tsx` + `TimeField.test.tsx`.
2. **Round-trips `HH:mm`.** Picking a time and saving persists it via
   `setReminderTime` and reschedules via `applyReminderSchedule` with the picked
   `HH:mm`. → `SettingsScreen.test.tsx`.
3. **No format-error state.** The "Invalid time. Use HH:mm." path is gone (a valid
   time is the only reachable value). → `SettingsScreen.test.tsx` (no error copy).
4. **Suite + `tsc` + `/check-arch` clean.** `npm test` green (net of the known
   pre-existing `MonthlyReport` date-driven failures), `tsc` clean, `/check-arch`
   reports no new cross-feature edge (`TimeField` is shared infra; Settings →
   `components` is always allowed).

## Design Decisions

- **(1) Keep the explicit "Save reminder" button** rather than auto-persisting on
  each pick. Lowest-churn (retains the `settings-reminder-save` testID and the
  `saveReminder` reschedule path) and keeps an explicit confirmation step
  consistent with the section's current behavior. *Rejected alt:* persist +
  reschedule immediately on pick (fewer taps, but changes the interaction model and
  the test surface for a Medium-priority polish item). **Confirm at the checkpoint.**
- **(2) `TimeField` displays the raw `HH:mm` string on the pill** rather than a
  friendly 12-hour label. It matches the `Pill` already shown in the section header
  and the stored format, and needs no new formatter util. *Rejected alt:* a
  `formatTime` helper for "9:00 PM" — extra surface not warranted here; revisit if
  a 12-hour display is desired app-wide.
- **(3) Model `TimeField` structurally on `DateField`** (same pill + native picker
  + local-component parse/format) so the two shared temporal fields stay
  consistent and reviewable side by side.

## Out of Scope (Deferred)

- A 12-hour / locale-aware time display or a shared `formatTime` util.
- Reworking `applyReminderSchedule`, `buildDailyReminder`, or the notification
  scheduling logic — behavior is unchanged; only the input surface changes.
- Any change to `DateField` or other date entry points.

## After This Slice

1. `/check-arch` — confirm `TimeField` imports no feature and Settings only reaches
   it via `@/components`.
2. `code-reviewer` subagent on the branch diff; address any `BLOCK` findings.
3. On-device verification: open Settings → tap the reminder pill → pick a time →
   Save; confirm the pill and the header `Pill` update and the reminder reschedules.
4. Mark VS-29 `✅ Done` in `docs/KANBAN.md` with the test count.
5. Delete `issues/ISSUE-029/` after verification.
