import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/** How many things in one section of the app need the user's attention. */
export interface AttentionCounts {
  /** Coming up soon (today included). */
  soon: number;
  /** Already late. */
  overdue: number;
}

const NONE: AttentionCounts = { soon: 0, overdue: 0 };

interface AttentionState {
  counts: Record<string, AttentionCounts>;
  set: (section: string, counts: AttentionCounts) => void;
}

const AttentionContext = createContext<AttentionState | null>(null);

/**
 * Holds "needs attention" counts that features publish and navigation chrome
 * reads — the drawer's dots, the menu button and the dashboard line. It lets a
 * feature surface its state without anything importing that feature: the
 * feature writes under a section key (see `constants/attention`), the readers
 * only know the key.
 */
export function AttentionProvider({ children }: { children: React.ReactNode }) {
  const [counts, setCounts] = useState<Record<string, AttentionCounts>>({});

  const set = useCallback((section: string, next: AttentionCounts) => {
    setCounts((prev) => {
      const current = prev[section];
      if (current && current.soon === next.soon && current.overdue === next.overdue) return prev;
      return { ...prev, [section]: next };
    });
  }, []);

  const value = useMemo(() => ({ counts, set }), [counts, set]);
  return <AttentionContext.Provider value={value}>{children}</AttentionContext.Provider>;
}

/** The counts one section published, or zeros (also outside a provider). */
export function useAttention(section: string): AttentionCounts {
  return useContext(AttentionContext)?.counts[section] ?? NONE;
}

/** Every section's counts added together — for the menu button's dot. */
export function useAnyAttention(): AttentionCounts {
  const counts = useContext(AttentionContext)?.counts;
  return useMemo(() => {
    const total = { soon: 0, overdue: 0 };
    for (const c of Object.values(counts ?? {})) {
      total.soon += c.soon;
      total.overdue += c.overdue;
    }
    return total;
  }, [counts]);
}

/** The setter a feature uses to publish its section's counts; a no-op outside a provider. */
export function useSetAttention(): (section: string, counts: AttentionCounts) => void {
  return useContext(AttentionContext)?.set ?? noop;
}

function noop(): void {}
