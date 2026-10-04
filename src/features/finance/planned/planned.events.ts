type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Subscribes to "planned purchases changed" — fired after any list or item
 * mutation, so the reminder scheduler can re-plan notifications and refresh the
 * drawer dot. Returns the unsubscribe function.
 */
export function onPlannedChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tells every subscriber that lists or items changed. */
export function notifyPlannedChange(): void {
  for (const listener of listeners) listener();
}
