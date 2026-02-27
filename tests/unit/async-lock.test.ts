import { AsyncLock } from "../../src/utils/async-lock";

describe("AsyncLock", () => {
  it("serialises concurrent acquisitions on the same key", async () => {
    const lock = new AsyncLock();
    const order: number[] = [];

    const task = async (id: number, delayMs: number) => {
      const release = await lock.acquire("key");
      try {
        order.push(id);
        await new Promise((r) => setTimeout(r, delayMs));
      } finally {
        release();
      }
    };

    // Launch 3 tasks concurrently — they must run in FIFO order
    await Promise.all([task(1, 30), task(2, 10), task(3, 10)]);

    expect(order).toEqual([1, 2, 3]);
  });

  it("allows independent keys to run in parallel", async () => {
    const lock = new AsyncLock();
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const task = async (key: string) => {
      const release = await lock.acquire(key);
      try {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise((r) => setTimeout(r, 20));
      } finally {
        concurrentCount--;
        release();
      }
    };

    await Promise.all([task("a"), task("b"), task("c")]);

    // All 3 should have run concurrently since keys are different
    expect(maxConcurrent).toBe(3);
  });

  it("cleans up key after release", async () => {
    const lock = new AsyncLock();
    const release = await lock.acquire("temp");
    release();

    // Should be able to acquire again immediately
    const release2 = await lock.acquire("temp");
    release2();
  });
});
