import * as Crypto from 'expo-crypto';

/**
 * Generates a random per-install salt as a lowercase hex string (16 bytes →
 * 32 hex chars). Stored alongside the PIN hash so two installs with the same
 * PIN never produce the same hash.
 */
export async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hashes a PIN with its salt using SHA-256, returning a lowercase hex digest.
 * Deterministic: the same `pin` + `salt` always yields the same hash, which is
 * how `verifyPin` re-derives and compares. This is a device-local lock, not the
 * cloud security boundary (that is the Supabase account) — a salted SHA-256 is
 * deliberately simple, per the auth slice's "not bcrypt, local-only" note.
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${pin}`);
}
