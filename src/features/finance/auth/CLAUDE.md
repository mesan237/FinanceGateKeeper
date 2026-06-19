# Auth Feature Context

## Domain Responsibility
The single-user/app record: local PIN lock (VS-02), app mode + reminder settings
(VS-08), action-bar style (VS-16), and the local profile (VS-22). The PIN is a
device-only lock; the cloud identity (email/password) is separate, in
`services/supabase.ts`.

## Database Tables
- `users` (single row) — id, pin_hash, pin_salt, app_mode (learning | control),
  reminder_time, notifications_enabled, action_bar_style, display_name,
  avatar_color, avatar_emoji, created_at. Excluded from cloud sync (device-local).

## Key Business Rules
- First launch: no PIN exists → forced setup flow (enter + confirm) via `AuthGate`.
- Subsequent launches: require PIN to unlock. 3 wrong attempts → 30-second cooldown
  (held in memory in `AuthProvider`; resets on relaunch).
- PIN is salted + SHA-256 hashed (`utils/pinHash`, expo-crypto) before storage —
  a simple local-only scheme, not bcrypt.
- `app_mode` defaults to `learning`. User switches to `control` or is prompted after 30 days.
- Lock state lives in `AuthProvider` (context wrapping the app); `AuthGate` in
  `app/_layout.tsx` renders `AuthScreen` until unlocked.
- Profile avatar is rendered on-device (emoji or name-initials on a color) — no image upload.
- Forgot-PIN recovery: re-authenticate with the cloud account password to reset the PIN
  (no data loss); users with no cloud backup get a confirm-guarded full local wipe
  (`services/database.resetLocalData`) — erasing the protected data is the only safe
  reset without an identity check.

## Files
- PIN/auth: `AuthProvider.tsx`, `AuthScreen.tsx`, `PinKeypad.tsx`, `ChangePinScreen.tsx`, `PinRecoveryScreen.tsx`.
- Profile: `ProfileScreen.tsx`, `ProfileAvatar.tsx`, `auth.profile.ts`.
- Shared: `CloudAccountCard.tsx` (cloud account UI, used by Settings + Profile),
  `SettingsScreen.tsx`, `AppModeProvider.tsx`, `DailyReminderScheduler.tsx`, `reminder.ts`.
- Core: `auth.hooks.ts`, `auth.service.ts`, `auth.types.ts`.
