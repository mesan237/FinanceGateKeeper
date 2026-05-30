import type { SqliteDriver } from '@/services/database';

export type AppMode = 'learning' | 'control';

export interface User {
  id: 1;
  pinHash: string;
  pinSalt: string;
  appMode: AppMode;
  createdAt: string;
}

export type Hasher = (input: string) => Promise<string>;
export type SaltGenerator = () => Promise<string>;

export interface AuthServiceDeps {
  driver: SqliteDriver;
  hasher: Hasher;
  generateSalt: SaltGenerator;
}

export interface AuthContextValue {
  isReady: boolean;
  hasPin: boolean;
  isLocked: boolean;
  appMode: AppMode;
  failedAttempts: number;
  cooldownUntilMs: number | null;
  setupPin: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
}
