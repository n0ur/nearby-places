import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import { setTimeout } from "node:timers/promises";
import { CleanupQueue } from "../src/cleanupQueue.js";

// Mock dependencies
const mockLogger = {
  info: mock.fn(),
};
const mockRoom = {
  leaveRoom: mock.fn(),
  deregisterUser: mock.fn(),
};

const cleanupQueue = new CleanupQueue(300);
cleanupQueue.setLogger(mockLogger);

describe("CleanupQueue", () => {
  beforeEach(() => {
    mockLogger.info.mock.resetCalls();
    mockRoom.leaveRoom.mock.resetCalls();
    mockRoom.deregisterUser.mock.resetCalls();
  });

  afterEach(() => {
    cleanupQueue.queue.clear();
  });

  it("calls room methods after delay and removes user from queue", async () => {
    cleanupQueue.enqueue(mockRoom, "user-1");

    assert.strictEqual(cleanupQueue.stats().size, 1);
    await setTimeout(cleanupQueue.delay + 50);

    const call = mockLogger.info.mock.calls[0];
    assert.strictEqual(call.arguments[0].event, "enqueued_cleanup");
    assert.strictEqual(call.arguments[0].userId, "user-1");
    assert.strictEqual(mockRoom.leaveRoom.mock.callCount(), 1);
    assert.strictEqual(mockRoom.deregisterUser.mock.callCount(), 1);
    assert.strictEqual(cleanupQueue.stats().size, 0);
  });

  it("does not call room methods if dequeued before delay", async () => {
    const enqueued = cleanupQueue.enqueue(mockRoom, "user-1");
    const dequeued = cleanupQueue.dequeue(mockRoom, "user-1");

    assert.strictEqual(enqueued, dequeued);
    assert.strictEqual(cleanupQueue.stats().size, 0);

    const call = mockLogger.info.mock.calls.find(
      (c) => c.arguments[0].event === "dequeued_cleanup",
    );
    assert.strictEqual(call.arguments[0].userId, "user-1");

    // no cleanup is called
    await setTimeout(cleanupQueue.delay + 50);
    assert.strictEqual(mockRoom.leaveRoom.mock.callCount(), 0);
    assert.strictEqual(mockRoom.deregisterUser.mock.callCount(), 0);
  });

  it("clears first timeout if called twice with the same user", async () => {
    const firstTimeout = cleanupQueue.enqueue(mockRoom, "user-1");
    const secondTimeout = cleanupQueue.enqueue(mockRoom, "user-1");

    // timeout is replaced
    assert.notStrictEqual(firstTimeout, secondTimeout);
    assert.strictEqual(cleanupQueue.stats().size, 1);
    await setTimeout(cleanupQueue.delay + 50);
    // only one timeout is executed
    assert.strictEqual(mockRoom.leaveRoom.mock.callCount(), 1);
    assert.strictEqual(mockRoom.deregisterUser.mock.callCount(), 1);
  });

  it("is idempotent for non-existent user", () => {
    cleanupQueue.dequeue(mockRoom, "user-1"); // no error
    assert.strictEqual(cleanupQueue.stats().size, 0);
  });

  it("throws if logger not set", () => {
    const noLoggerQueue = new CleanupQueue();
    assert.throws(() => noLoggerQueue.enqueue(mockRoom, "user-1"), {
      name: "ServiceError",
    });
  });
});
