import { createHash } from 'node:crypto';

import type { Hasher, SaltGenerator } from '@/features/finance/auth/auth.types';

/**
 * Node-only SHA-256 hasher for Jest tests. Never imported by app code so the
 * React Native bundler does not try to resolve `node:crypto`.
 */
export function createNodeHasher(): Hasher {
  return async (input) => createHash('sha256').update(input).digest('hex');
}

/**
 * Deterministic counting salt generator for tests. Each call returns a fresh
 * 32-char salt so two consecutive setPin calls produce different hashes.
 */
export function createCountingSaltGenerator(seed = 0): SaltGenerator {
  let counter = seed;
  return async () => {
    counter += 1;
    return `salt-${counter.toString(16).padStart(32, '0')}`;
  };
}
