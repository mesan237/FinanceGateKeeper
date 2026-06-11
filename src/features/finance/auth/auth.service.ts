import { execute, query } from '@/services/database';

import type { ActionBarStyle, AppMode, AppSettings } from './auth.types';

interface UserRow {
  id: number;
  app_mode: AppMode;
  reminder_time: string;
  notifications_enabled: number;
  action_bar_style: ActionBarStyle;
  created_at: string;
}

const USER_COLUMNS = 'id, app_mode, reminder_time, notifications_enabled, action_bar_style, created_at';
const VALID_ACTION_BAR_STYLES: ReadonlySet<string> = new Set(['explicit', 'speed_dial']);
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH_1_MS = 30 * 24 * 60 * 60 * 1000;

function mapSettings(row: UserRow): AppSettings {
  return {
    appMode: row.app_mode,
    reminderTime: row.reminder_time,
    notificationsEnabled: row.notifications_enabled === 1,
    createdAt: row.created_at,
  };
}

/**
 * Returns the single app/user row, creating it with defaults on first call. The
 * app is single-user, so there is exactly one row (id 1). Centralizing the
 * get-or-create here means every reader and writer sees a row.
 */
async function getOrCreateUserRow(): Promise<UserRow> {
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
