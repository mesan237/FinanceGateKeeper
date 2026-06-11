import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env',
  );
}

/**
 * Persists the Supabase auth session in the device keychain/keystore via
 * expo-secure-store, so a signed-in user stays signed in across app restarts
 * without the password ever being stored. The local PIN (VS-02) is a separate,
 * device-only lock — the cloud identity here is the email/password account.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/** Singleton Supabase client used by the sync engine and auth helpers. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * Creates a new cloud account with the given email and password.
 *
 * @throws if Supabase rejects the sign-up (e.g. weak password, email in use).
 */
export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
}

/**
 * Signs into an existing cloud account.
 *
 * @throws if the credentials are invalid or Supabase is unreachable.
 */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

/**
 * Signs out and clears the persisted session.
 *
 * @throws if Supabase reports a sign-out error.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** Returns the signed-in user's id, or null when no session exists. */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

/** Returns the signed-in user's id and email, or null when no session exists. */
export async function getCurrentUser(): Promise<{ id: string; email: string | null } | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user ? { id: user.id, email: user.email ?? null } : null;
}
