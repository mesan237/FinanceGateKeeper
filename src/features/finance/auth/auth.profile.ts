import { execute } from '@/services/database';

import { getOrCreateUserRow } from './auth.service';
import type { Profile } from './auth.types';

/** Reads the local profile, seeding the single user row on first run. */
export async function getProfile(): Promise<Profile> {
  const row = await getOrCreateUserRow();
  return {
    displayName: row.display_name,
    avatarColor: row.avatar_color,
    avatarEmoji: row.avatar_emoji,
  };
}

/**
 * Updates the profile. Only the supplied fields are written, so callers can
 * patch the name without clearing the avatar (and vice versa). Passing an
 * explicit `null` clears a field.
 */
export async function setProfile(patch: Partial<Profile>): Promise<void> {
  const row = await getOrCreateUserRow();
  const sets: string[] = [];
  const params: Array<string | null> = [];

  if ('displayName' in patch) {
    sets.push('display_name = ?');
    params.push(patch.displayName ?? null);
  }
  if ('avatarColor' in patch) {
    sets.push('avatar_color = ?');
    params.push(patch.avatarColor ?? null);
  }
  if ('avatarEmoji' in patch) {
    sets.push('avatar_emoji = ?');
    params.push(patch.avatarEmoji ?? null);
  }
  if (sets.length === 0) return;

  await execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...params, row.id]);
}
