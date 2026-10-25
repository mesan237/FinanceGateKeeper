import { execute, query } from '@/services/database';

/**
 * Reads a UI preference stored on this phone (UX-14), or null when the user
 * has never set it. Preferences are local only and never synced.
 */
export async function getPreference(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>('SELECT value FROM ui_preferences WHERE key = ?', [key]);
  return rows[0]?.value ?? null;
}

/** Stores a UI preference on this phone, replacing any earlier value (UX-14). */
export async function setPreference(key: string, value: string): Promise<void> {
  await execute(
    'INSERT INTO ui_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}
