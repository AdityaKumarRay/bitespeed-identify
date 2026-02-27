/**
 * AsyncLock — simple keyed async mutex for serialising concurrent operations.
 *
 * Usage:
 *   const lock = new AsyncLock();
 *   const release = await lock.acquire("some-key");
 *   try { … } finally { release(); }
 *
 * Guarantees:
 *  • Only one holder per key at a time.
 *  • FIFO ordering for waiters on the same key.
 *  • Idle keys are automatically cleaned up to prevent memory leaks.
 *
 * Appropriate for single-instance deployments (e.g. Render web service).
 * For multi-instance environments swap this for a distributed lock
 * (Redis SETNX / Redlock, or Postgres advisory locks via raw SQL).
 */
export class AsyncLock {
  private locks = new Map<string, Promise<void>>();

  /**
   * Acquire the lock for the given key.
   * Resolves with a `release` callback once the lock is available.
   */
  async acquire(key: string): Promise<() => void> {
    // Wait for any existing holder on this key to finish
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    // Create a new deferred promise that will resolve when we release
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = () => {
        this.locks.delete(key);
        resolve();
      };
    });

    this.locks.set(key, gate);
    return release;
  }
}

/** Singleton lock instance for the identify service. */
export const identifyLock = new AsyncLock();
