import { ServiceError } from "./models/errors.js";

const CLEANUP_DELAY_MS = 30 * 1000; // 30 secs
export const SSE_RETRY_MS = 5 * 1000; // 5 secs

export class CleanupQueue {
  constructor(delay = CLEANUP_DELAY_MS) {
    this.queue = new Map();
    this.logger = null;
    this.delay = delay;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  getLogger() {
    if (!this.logger) {
      throw new ServiceError("Logger not initialized");
    }
    return this.logger;
  }

  enqueue(room, userId) {
    if (this.queue.has(userId)) {
      const timeout = this.queue.get(userId);
      clearTimeout(timeout);
    }

    this.getLogger().info({ event: "enqueued_cleanup", userId });

    const timeout = setTimeout(() => {
      this.getLogger().info({ event: "cleanup", userId });
      room.leaveRoom(userId);
      room.deregisterUser(userId);
      this.queue.delete(userId);
    }, this.delay);

    this.queue.set(userId, timeout);

    return timeout;
  }

  dequeue(room, userId) {
    if (this.queue.has(userId)) {
      this.getLogger().info({ event: "dequeued_cleanup", userId });
      const timeout = this.queue.get(userId);
      clearTimeout(timeout);
      this.queue.delete(userId);
      return timeout;
    }
  }

  stats() {
    const stat = {
      size: this.queue.size,
      userIds: this.queue.keys(),
    };
    this.getLogger().info({ event: "queue_stats", ...stat });
    return stat;
  }

  clear() {
    for (const timeout of cleanupQueue.queue.values()) {
      clearTimeout(timeout);
    }
    this.queue.clear();
  }
}

export const cleanupQueue = new CleanupQueue();
