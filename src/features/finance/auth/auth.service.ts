import { execute, query } from '@/services/database';
import { generateSalt, hashPin } from '@/utils/pinHash';

import type { ActionBarStyle, AppMode, AppSettings } from './auth.types';

export interface UserRow {
  id: number;
  pin_hash: string | null;
  pin_salt: string | null;
  app_mode: AppMode;
  reminder_time: string;
  notifications_enabled: number;
  action_bar_style: ActionBarStyle;
  display_name: string | null;
  avatar_color: string | null;
  avatar_emoji: string | null;
  created_at: string;
  onboarding_complete: number;
}

const USER_COLUMNS =
  'id, pin_hash, pin_salt, app_mode, reminder_time, notifications_enabled, action_bar_style, display_name, avatar_color, avatar_emoji, created_at, onboarding_complete';
const VALID_ACTION_BAR_STYLES: ReadonlySet<string> = new Set(['explicit', 'speed_dial']);
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const PIN_PATTERN = /^\d{4}$/;
const MONTH_1_MS = 30 * 24 * 60 * 60 * 1000;

function mapSettings(row: UserRow): AppSettings {
  return {
    appMode: row.app_mode,
    reminderTime: row.reminder_time,
    notificationsEnabled: row.notifications_enabled === 1,
    createdAt: row.created_at,
    onboardingComplete: row.onboarding_complete === 1,
  };
}

/**
 * Returns the single app/user row, creating it with defaults on first call. The
 * app is single-user, so there is exactly one row (id 1). Centralizing the
 * get-or-create here means every reader and writer sees a row.
 */
export async function getOrCreateUserRow(): Promise<UserRow> {
  const [existing] = await query<UserRow>(`SELECT ${USER_COLUMNS} FROM users ORDER BY id LIMIT 1`);
  if (existing) return existing;

  await execute('INSERT INTO users (created_at) VALUES (?)', [new Date().toISOString()]);
  const [created] = await query<UserRow>(`SELECT ${USER_COLUMNS} FROM users ORDER BY id LIMIT 1`);
  return created;
}

/** Reads the app settings, seeding a default row on first run. */
export async function getAppSettings(): Promise<AppSettings> {
  return mapSettings(await getOrCreateUserRow());
}

/** Switches the app between learning and control mode. */
export async function setAppMode(mode: AppMode): Promise<void> {
  const row = await getOrCreateUserRow();
  await execute('UPDATE users SET app_mode = ? WHERE id = ?', [mode, row.id]);
}

/**
 * Sets the daily reminder time.
 *
 * @param time 24-hour `HH:mm`.
 * @throws if `time` is not a valid `HH:mm` value.
 */
export async function setReminderTime(time: string): Promise<void> {
  if (!HHMM.test(time)) {
    throw new Error(`Invalid reminder time: ${time}. Expected HH:mm.`);
  }
  const row = await getOrCreateUserRow();
  await execute('UPDATE users SET reminder_time = ? WHERE id = ?', [time, row.id]);
}

/** Enables or disables all local notifications. */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  const row = await getOrCreateUserRow();
  await execute('UPDATE users SET notifications_enabled = ? WHERE id = ?', [
    enabled ? 1 : 0,
    row.id,
  ]);
}

/**
 * Whether the user has used the app for at least 30 days since first run — the
 * cue to suggest switching from learning to control mode.
 *
 * @param nowISO Reference "now" (default: current time). Injectable for tests.
 */
export async function isMonth1Complete(nowISO: string = new Date().toISOString()): Promise<boolean> {
  const row = await getOrCreateUserRow();
  const elapsed = new Date(nowISO).getTime() - new Date(row.created_at).getTime();
  return elapsed >= MONTH_1_MS;
}

/**
 * Marks the first-run onboarding carousel as finished (or skipped). Persisted on
 * the single `users` row so it survives relaunch; VS-23 shows the carousel only
 * while this is `false`.
 */
export async function setOnboardingComplete(value: boolean): Promise<void> {
  const row = await getOrCreateUserRow();
  await execute('UPDATE users SET onboarding_complete = ? WHERE id = ?', [value ? 1 : 0, row.id]);
}

/** Whether a local PIN has been configured (the unlock gate is active). */
export async function hasPin(): Promise<boolean> {
  const row = await getOrCreateUserRow();
  return row.pin_hash != null;
}

/**
 * Sets (or replaces) the local PIN. Generates a fresh salt each time and stores
 * the salted hash — the raw PIN is never persisted.
 *
 * @throws if `pin` is not exactly four digits.
 */
export async function setPin(pin: string): Promise<void> {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error('PIN must be exactly four digits.');
  }
  const row = await getOrCreateUserRow();
  const salt = await generateSalt();
  const hash = await hashPin(pin, salt);
  await execute('UPDATE users SET pin_hash = ?, pin_salt = ? WHERE id = ?', [hash, salt, row.id]);
}

/**
 * Verifies a PIN entry against the stored hash. Returns `false` when no PIN is
 * set, so callers never accidentally unlock an unconfigured app.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const row = await getOrCreateUserRow();
  if (row.pin_hash == null || row.pin_salt == null) return false;
  const hash = await hashPin(pin, row.pin_salt);
  return hash === row.pin_hash;
}

/**
 * Changes the PIN, requiring the current PIN to authorise the change.
 *
 * @throws if `current` does not match the stored PIN, or `next` is malformed.
 */
export async function changePin(current: string, next: string): Promise<void> {
  if (!(await verifyPin(current))) {
    throw new Error('Current PIN is incorrect.');
  }
  await setPin(next);
}

/** Clears the local PIN, removing the unlock gate. */
export async function clearPin(): Promise<void> {
  const row = await getOrCreateUserRow();
  await execute('UPDATE users SET pin_hash = NULL, pin_salt = NULL WHERE id = ?', [row.id]);
}

/** Returns the current action bar style, defaulting to `'explicit'` before first set. */
export async function getActionBarStyle(): Promise<ActionBarStyle> {
  const row = await getOrCreateUserRow();
  return row.action_bar_style ?? 'explicit';
}

/**
 * Persists the action bar style preference.
 *
 * @throws if `style` is not a valid ActionBarStyle value.
 */
export async function setActionBarStyle(style: ActionBarStyle): Promise<void> {
  if (!VALID_ACTION_BAR_STYLES.has(style)) {
    throw new Error(`Invalid action bar style: "${style}". Expected 'explicit' or 'speed_dial'.`);
  }
  const row = await getOrCreateUserRow();
  await execute('UPDATE users SET action_bar_style = ? WHERE id = ?', [style, row.id]);
}
