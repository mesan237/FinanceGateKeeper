type Listener = () => void;

let queue: Promise<unknown> = Promise.resolve();
let syncInFlight: Promise<unknown> | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Runs jobs that rewrite local data one at a time, in call order. Syncs and
 * restores share one SQLite connection, so a second one running inside the
 * first's transaction would corrupt or lose its work. A failed job never blocks
 * the next, and its error still reaches its own caller.
 */
export function runExclusive<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work);
  queue = result.catch(() => undefined);
  return result;
}

/**
 * Runs a sync through `runExclusive`, or joins the one already running, so app
 * open, foreground and "Back up now" never stack up. Reported as running from
 * this call until it settles, including while it waits its turn.
 */
export function runSingleSync<T>(work: () => Promise<T>): Promise<T> {
  if (syncInFlight) return syncInFlight as Promise<T>;

  const run = runExclusive(work).finally(() => {
    syncInFlight = null;
    notify();
  });
  syncInFlight = run;
  notify();
  return run;
}

/** True while a sync is running or waiting its turn, whoever started it. */
export function isSyncRunning(): boolean {
  return syncInFlight !== null;
}

/** Calls `listener` when a sync starts or ends; returns the unsubscribe function. */
export function subscribeSyncRunning(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
