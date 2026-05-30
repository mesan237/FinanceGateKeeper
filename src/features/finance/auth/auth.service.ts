import type { SqliteDriver } from '@/services/database';

import type {
  AppMode,
  AuthServiceDeps,
  Hasher,
  SaltGenerator,
} from '@/features/finance/auth/auth.types';

interface UserRow {
  pin_hash: string;
  pin_salt: string;
  app_mode: AppMode;
}

/**
 * Hashes a PIN with a per-user random salt. Pure: same inputs → same output.
 * The hasher is injected so tests can substitute a Node implementation for the
 * runtime expo-crypto SHA-256.
 */
export async function hashPin(pin: string, salt: string, hasher: Hasher): Promise<string> {
  return hasher(`${pin}:${salt}`);
}

/**
 * Returns true when a PIN has been set up on this device (single users row exists).
 */
export async function hasPin(deps: { driver: SqliteDriver }): Promise<boolean> {
  const rows = await deps.driver.query<{ count: number }>(
    'SELECT COUNT(*) AS count FROM users WHERE id = 1',
  );
  return (rows[0]?.count ?? 0) > 0;
}

/**
 * Persists a new PIN (first-time setup) or replaces the existing one. Generates
 * a fresh random salt each call so an attacker cannot reuse a stolen hash.
 */
export async function setPin(pin: string, deps: AuthServiceDeps): Promise<void> {
  const salt = await deps.generateSalt();
  const pinHash = await hashPin(pin, salt, deps.hasher);
  const now = new Date().toISOString();
  await deps.driver.execute(
    `INSERT INTO users (id, pin_hash, pin_salt, created_at)
     VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       pin_hash = excluded.pin_hash,
       pin_salt = excluded.pin_salt`,
    [pinHash, salt, now],
  );
}

/**
 * Returns true when the supplied PIN's hash matches the stored hash for this device.
 */
export async function verifyPin(pin: string, deps: AuthServiceDeps): Promise<boolean> {
  const rows = await deps.driver.query<UserRow>(
    'SELECT pin_hash, pin_salt, app_mode FROM users WHERE id = 1',
  );
  if (rows.length === 0) return false;
  const computed = await hashPin(pin, rows[0].pin_salt, deps.hasher);
  return computed === rows[0].pin_hash;
}

/**
 * Returns the persisted app mode, defaulting to 'learning' before any PIN is set.
 */
export async function getAppMode(deps: { driver: SqliteDriver }): Promise<AppMode> {
  const rows = await deps.driver.query<{ app_mode: AppMode }>(
    'SELECT app_mode FROM users WHERE id = 1',
  );
  return rows[0]?.app_mode ?? 'learning';
}

/**
 * Updates the app mode on the single users row.
 */
export async function setAppMode(
  mode: AppMode,
  deps: { driver: SqliteDriver },
): Promise<void> {
  await deps.driver.execute('UPDATE users SET app_mode = ? WHERE id = 1', [mode]);
}

/**
 * Lazy-loaded expo-crypto SHA-256 hasher. Use in the React Native runtime; tests
 * use createNodeHasher() so they never import expo-crypto.
 */
export async function createExpoCryptoHasher(): Promise<Hasher> {
  const { digestStringAsync, CryptoDigestAlgorithm, CryptoEncoding } = await import(
    'expo-crypto'
  );
  return async (input) =>
    digestStringAsync(CryptoDigestAlgorithm.SHA256, input, {
      encoding: CryptoEncoding.HEX,
    });
}

/**
 * Lazy-loaded expo-crypto random salt generator. Use in the React Native runtime.
 */
export async function createExpoSaltGenerator(): Promise<SaltGenerator> {
  const { getRandomBytesAsync } = await import('expo-crypto');
  return async () => {
    const bytes = await getRandomBytesAsync(16);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };
}

