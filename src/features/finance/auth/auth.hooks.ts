import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createExpoCryptoHasher,
  createExpoSaltGenerator,
  getAppMode as readAppMode,
  hasPin as readHasPin,
  setPin as writePin,
  verifyPin as checkPin,
} from '@/features/finance/auth/auth.service';
import type {
  AppMode,
  AuthContextValue,
  AuthServiceDeps,
} from '@/features/finance/auth/auth.types';
import { getDriver } from '@/services/database';

export const FAILED_ATTEMPT_LIMIT = 3;
export const COOLDOWN_MS = 30_000;

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Tests inject a fully-built dependency set so the provider never touches
   * expo-sqlite or expo-crypto. In production the provider builds these itself.
   */
  deps?: AuthServiceDeps;
  /** Override Date.now() — tests use this to fast-forward through the cooldown. */
  now?: () => number;
}

/**
 * Provides authentication state to the React tree. Hydrates once on mount by
 * reading whether a PIN exists and the persisted app mode, then exposes
 * setupPin / unlock / lock actions.
 */
export function AuthProvider({ children, deps: depsProp, now }: AuthProviderProps) {
  const clock = useRef(now ?? Date.now);
  useEffect(() => {
    clock.current = now ?? Date.now;
  }, [now]);

  const [deps, setDeps] = useState<AuthServiceDeps | null>(depsProp ?? null);
  const [isReady, setIsReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>('learning');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntilMs, setCooldownUntilMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      let resolved = depsProp;
      if (!resolved) {
        const driver = await getDriver();
        const hasher = await createExpoCryptoHasher();
        const generateSalt = await createExpoSaltGenerator();
        resolved = { driver, hasher, generateSalt };
      }
      const pinSet = await readHasPin({ driver: resolved.driver });
      const mode = await readAppMode({ driver: resolved.driver });
      if (cancelled) return;
      setDeps(resolved);
      setHasPin(pinSet);
      setIsLocked(pinSet);
      setAppMode(mode);
      setIsReady(true);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [depsProp]);

  const unlock = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!deps) return false;
      if (cooldownUntilMs !== null && cooldownUntilMs > clock.current()) return false;
      const ok = await checkPin(pin, deps);
      if (ok) {
        setIsLocked(false);
        setFailedAttempts(0);
        setCooldownUntilMs(null);
        return true;
      }
      const next = failedAttempts + 1;
      if (next >= FAILED_ATTEMPT_LIMIT) {
        setCooldownUntilMs(clock.current() + COOLDOWN_MS);
        setFailedAttempts(0);
      } else {
        setFailedAttempts(next);
      }
      return false;
    },
    [deps, failedAttempts, cooldownUntilMs],
  );

  const setupPin = useCallback(
    async (pin: string): Promise<void> => {
      if (!deps) throw new Error('AuthProvider not ready');
      await writePin(pin, deps);
      setHasPin(true);
      setIsLocked(false);
      setFailedAttempts(0);
      setCooldownUntilMs(null);
    },
    [deps],
  );

  const lock = useCallback(() => {
    setIsLocked(true);
    setFailedAttempts(0);
    setCooldownUntilMs(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady,
      hasPin,
      isLocked,
      appMode,
      failedAttempts,
      cooldownUntilMs,
      setupPin,
      unlock,
      lock,
    }),
    [
      isReady,
      hasPin,
      isLocked,
      appMode,
      failedAttempts,
      cooldownUntilMs,
      setupPin,
      unlock,
      lock,
    ],
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

/**
 * Accessor for the AuthProvider context. Throws when used outside a provider so
 * mis-wired routes surface the error at mount time instead of returning stale data.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>');
  return ctx;
}
