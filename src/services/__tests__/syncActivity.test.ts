import { isSyncRunning, runExclusive, runSingleSync, subscribeSyncRunning } from '@/services/syncActivity';

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (e: Error) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('runExclusive', () => {
  it('runs the next job only after the current one finished', async () => {
    const first = deferred<string>();
    const second = jest.fn().mockResolvedValue('second');

    const firstResult = runExclusive(() => first.promise);
    const secondResult = runExclusive(second);
    await flush();
    expect(second).not.toHaveBeenCalled();

    first.resolve('first');
    await expect(firstResult).resolves.toBe('first');
    await expect(secondResult).resolves.toBe('second');
  });

  it('still runs the next job when the current one fails', async () => {
    const failed = runExclusive(() => Promise.reject(new Error('boom')));
    const next = runExclusive(() => Promise.resolve('next'));

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('next');
  });
});

describe('runSingleSync', () => {
  it('joins a sync already running instead of starting a second one', async () => {
    const gate = deferred<string>();
    const work = jest.fn(() => gate.promise);

    const first = runSingleSync(work);
    const second = runSingleSync(work);
    await flush();
    gate.resolve('done');

    await expect(first).resolves.toBe('done');
    await expect(second).resolves.toBe('done');
    expect(work).toHaveBeenCalledTimes(1);
  });

  it('reports the sync as running from the call until it settles, and tells subscribers', async () => {
    const gate = deferred<string>();
    const listener = jest.fn();
    const unsubscribe = subscribeSyncRunning(listener);
    expect(isSyncRunning()).toBe(false);

    const result = runSingleSync(() => gate.promise);
    expect(isSyncRunning()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    gate.resolve('done');
    await result;
    expect(isSyncRunning()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('stops reporting a sync that failed, so the next one can start', async () => {
    await expect(runSingleSync(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(isSyncRunning()).toBe(false);

    await expect(runSingleSync(() => Promise.resolve('again'))).resolves.toBe('again');
  });

  it('waits for an exclusive job before it starts', async () => {
    const restore = deferred<void>();
    const work = jest.fn().mockResolvedValue('synced');

    const running = runExclusive(() => restore.promise);
    const sync = runSingleSync(work);
    await flush();
    expect(work).not.toHaveBeenCalled();

    restore.resolve();
    await running;
    await expect(sync).resolves.toBe('synced');
  });
});
