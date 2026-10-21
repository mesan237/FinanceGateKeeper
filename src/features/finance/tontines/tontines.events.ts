type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Subscribes to "tontines changed" — fired after any tontine or payment write,
 * so the reminder scheduler re-plans and the drawer dot refreshes (VS-52).
 * Returns the unsubscribe function.
 */
export function onTontineChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tells every subscriber that a tontine or a payment changed. */
export function notifyTontineChange(): void {
  for (const listener of listeners) listener();
}
