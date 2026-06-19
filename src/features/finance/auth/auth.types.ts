/**
 * The app's two onboarding modes. `learning` (the first-run default) hides the
 * budget/allocation machinery so the user only builds the logging habit;
 * `control` reveals the full app. A small closed enum, guarded by a CHECK
 * constraint on the `users` table and a runtime check in `auth.service`.
 */
export type AppMode = 'learning' | 'control';

/**
 * The single-row app/user settings record. VS-08 owns the app-mode and
 * reminder fields; VS-02 will later add PIN state to the same `users` row.
 */
export interface AppSettings {
  appMode: AppMode;
  /** End-of-day reminder time as `HH:mm`, 24-hour (default `21:00`). */
  reminderTime: string;
  notificationsEnabled: boolean;
  /** ISO timestamp of first run — anchors the "month 1 complete" check. */
  createdAt: string;
}

export type { ActionBarStyle } from '@/types/settings';

/**
 * The local PIN lock's runtime state. `unset` — no PIN configured, the app is
 * open (first run before setup). `locked` — a PIN exists and the app is gated.
 * `unlocked` — the correct PIN was entered this session. Held in memory by
 * `AuthProvider`; only the hash/salt persist (on the `users` row).
 */
export type PinState = 'unset' | 'locked' | 'unlocked';

/**
 * The user's local profile. All fields are nullable — a fresh install has no
 * name or avatar. The avatar is rendered on-device (initials/emoji on a color),
 * never an uploaded image. Lives on the single `users` row (device-local, not
 * synced).
 */
export interface Profile {
  displayName: string | null;
  avatarColor: string | null;
  avatarEmoji: string | null;
}

/** The mutable subset of `AppSettings`, used by the settings update helpers. */
export type AppSettingsPatch = Partial<
  Pick<AppSettings, 'appMode' | 'reminderTime' | 'notificationsEnabled'>
>;
