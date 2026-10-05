# Notifications Context (Shared Infrastructure)

## Responsibility
Scheduling and managing local push notifications via Expo Notifications. This is shared infrastructure — it does NOT contain business logic. Features decide WHEN to notify; this module handles HOW.

## Structure
```
notifications/
├── notifications.service.ts   — Schedule, cancel, request permissions
├── notifications.config.ts    — Channel setup, default messages
├── notifications.types.ts     — NotificationType, NotificationPayload
└── triggers/
    ├── dailyReminder.ts       — End-of-day logging reminder
    ├── zeroDayCheck.ts        — Zero-day confirmation prompt
    ├── overBudget.ts          — Over-budget warning (in-app, not push)
    ├── debtDueDate.ts         — Debt approaching/overdue reminder
    ├── plannedDue.ts          — Planned purchase due soon / today / overdue (scheduled, VS-39)
    └── projectTimeline.ts     — Project timeline shift alert
```

## Rules
- `notifications.service.ts` is a thin wrapper around Expo Notifications API. No domain logic.
- Each trigger file is a pure function: takes input data, returns a notification payload. Does NOT call the database.
- Features call triggers, then pass the result to `notifications.service.scheduleNotification()`.
- Over-budget alert is in-app only (modal), not a push notification. The trigger file just formats the message.
- Daily reminder defaults to 21:00 local time. Configurable in settings.
- Debt reminders fire 3 days before due date, then daily after due date until settled.
- Planned-purchase reminders: 09:00 three days before a list's day, 09:00 on the day, then the next 09:00 while overdue. One per list and day; re-planned (cancel + schedule) on every open, foreground and planned change.

## Import Rules
- This folder can import from `utils/`, `constants/`, `types/` only.
- NEVER import from `features/` or `app/`.
- Features import FROM this folder, not the other way around.
