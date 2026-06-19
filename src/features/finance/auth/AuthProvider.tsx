import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { clearPin, hasPin as hasPinService, setPin, verifyPin } from './auth.service';
import type { PinState } from './auth.types';

/** Wrong PIN entries allowed before a cooldown kicks in. */
export const MAX_ATTEMPTS = 3;
/** Cooldown length after `MAX_ATTEMPTS` wrong entries, in milliseconds. */
export const COOLDOWN_MS = 30_000;

interface AuthLockContextValue {
  /** False until the initial `hasPin` read resolves — gate renders nothing meanwhile. */
  ready: boolean;
  pinState: PinState;
  /** Remaining wrong attempts before a cooldown (resets on success). */
  attemptsLeft: number;
  /** Epoch ms until which entry is locked out, or null when not cooling down. */
  cooldownUntil: number | null;
  /** Creates the first PIN and unlocks. Throws if `pin` is malformed. */
  setupPin: (pin: string) => Promise<void>;
  /** Verifies a PIN; returns whether it unlocked. Tracks attempts/cooldown. */
  unlock: (pin: string) => Promise<boolean>;
  /** Re-locks the app (e.g. after a PIN change). */
  lock: () => void;
  /**
   * Clears the stored PIN and returns to the setup flow. Used by the "Forgot
   * PIN?" recovery flow once identity is verified (or the device wiped), so the
   * user can immediately set a new PIN.
   */
  resetPin: () => Promise<void>;
  /** Re-reads whether a PIN exists (call after set/clear in Settings). */
  refresh: () => Promise<void>;
}

const AuthLockContext = createContext<AuthLockContextValue | null>(null);

/**
 * Holds the local PIN lock state for the whole tree. On mount it reads whether
 * a PIN exists: if so the app starts `locked`, otherwise `unset` (open). The
 * hash/salt persist on the `users` row; the locked/unlocked decision and the
 * 3-strikes-then-30s cooldown live here in memory (they reset on relaunch,
 * which is fine for a device-local gate). The routing layer renders `AuthScreen`
 * until `pinState === 'unlocked'`.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [pinState, setPinState] = useState<PinState>('unset');
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const exists = await hasPinService();
    setPinState((prev) => (prev === 'unlocked' ? prev : exists ? 'locked' : 'unset'));
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setupPin = useCallback(async (pin: string) => {
    await setPin(pin);
    setWrongAttempts(0);
    setCooldownUntil(null);
    setPinState('unlocked');
  }, []);

  const unlock = useCallback(
    async (pin: string): Promise<boolean> => {
      if (cooldownUntil != null && Date.now() < cooldownUntil) return false;

      const ok = await verifyPin(pin);
      if (ok) {
        setWrongAttempts(0);
        setCooldownUntil(null);
        setPinState('unlocked');
        return true;
      }

      setWrongAttempts((prev) => {
        const next = prev + 1;
        if (next >= MAX_ATTEMPTS) {
          setCooldownUntil(Date.now() + COOLDOWN_MS);
          return 0;
        }
        return next;
      });
      return false;
    },
    [cooldownUntil],
  );

  const lock = useCallback(() => {
    setPinState('locked');
  }, []);

  const resetPin = useCallback(async () => {
    await clearPin();
    setWrongAttempts(0);
    setCooldownUntil(null);
    setPinState('unset');
  }, []);

  const value = useMemo<AuthLockContextValue>(
    () => ({
      ready,
      pinState,
      attemptsLeft: MAX_ATTEMPTS - wrongAttempts,
      cooldownUntil,
      setupPin,
      unlock,
      lock,
      resetPin,
      refresh,
    }),
    [ready, pinState, wrongAttempts, cooldownUntil, setupPin, unlock, lock, resetPin, refresh],
  );

  return <AuthLockContext.Provider value={value}>{children}</AuthLockContext.Provider>;
}

/** Returns the PIN lock context. Throws if used outside `AuthProvider`. */
export function useAuthLock(): AuthLockContextValue {
  const ctx = useContext(AuthLockContext);
  if (!ctx) throw new Error('useAuthLock must be used within an AuthProvider');
  return ctx;
}
