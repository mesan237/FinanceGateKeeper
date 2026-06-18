import React, { useEffect, useRef, useState } from 'react';
import { type StyleProp, type TextStyle } from 'react-native';

import { Typography, type TypographyVariant } from '@/components/Typography';
import { formatCurrency } from '@/utils/formatCurrency';

const DEFAULT_DURATION_MS = 600;

/** easeOutCubic — fast start, gentle settle. Mirrors the count's "snap then ease" feel. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** rAF with a setTimeout fallback for environments that lack it (e.g. some test runners). */
const raf =
  typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb: (t: number) => void) => setTimeout(() => cb(Date.now()), 16) as unknown as number;
const cancelRaf =
  typeof cancelAnimationFrame === 'function'
    ? cancelAnimationFrame
    : (id: number) => clearTimeout(id);

export interface AnimatedCounterProps {
  /** The numeric target to display. */
  value: number;
  /** Formats the number for display. Defaults to FCFA currency. */
  format?: (n: number) => string;
  /** Animation length in ms when the value changes. */
  duration?: number;
  variant?: TypographyVariant;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * A figure that counts up to its target when it changes — e.g. the dashboard
 * refreshing after an expense is logged ticks the number to its new value
 * rather than snapping. The first render shows `value` directly (no cold-start
 * count from zero), so a freshly mounted figure is correct immediately.
 *
 * Renders through `Typography`, so the live text is queryable as plain text.
 */
export function AnimatedCounter({
  value,
  format = formatCurrency,
  duration = DEFAULT_DURATION_MS,
  variant,
  style,
  testID,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  // Tracks the figure currently on screen so a mid-flight change animates from it.
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const current = Math.round(from + (to - from) * easeOutCubic(t));
      setDisplay(current);
      fromRef.current = current;
      if (t < 1) {
        frame = raf(tick);
      } else {
        setDisplay(to);
        fromRef.current = to;
      }
    };
    frame = raf(tick);
    return () => cancelRaf(frame);
  }, [value, duration]);

  return (
    <Typography variant={variant} style={style} testID={testID}>
      {format(display)}
    </Typography>
  );
}
