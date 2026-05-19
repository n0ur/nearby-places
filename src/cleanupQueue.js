import { ServiceError } from "./models/errors.js";

const CLEANUP_DELAY_MS = 30 * 1000; // 30 secs

class CleanupQueue {
  constructor() {
    this.queue = new Map();
    this.logger = null;
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
    this.getLogger().info({ event: "equeued_cleanup", userId });
    this.queue.set(
      userId,
      setTimeout(() => {
        this.getLogger().info({ event: "cleanup", userId });
        room.leaveRoom(userId);
        room.deregisterUser(userId);
      }, CLEANUP_DELAY_MS),
    );
  }

  dequeue(room, userId) {
    console.log(this.queue, userId);
    if (this.queue.has(userId)) {
      this.getLogger().info({ event: "dequeued_cleanup", userId });
      const timeout = this.queue.get(userId);
      clearTimeout(timeout);
      this.queue.delete(userId);
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
}

export const cleanupQueue = new CleanupQueue();
