import { SSE_RETRY_MS } from "../constants.js";

export class NotificationService {
  constructor() {
    this.listeners = new Map(); // <id, reply.sse>
  }

  addListener(id, sse) {
    this.listeners.set(id, sse);
  }

  removeListener(id) {
    this.listeners.delete(id);
  }

  async notify(event, data, userId = null, userData = null) {
    const promises = this.listeners
      .entries()
      .map(([id, sse]) => {
        if (sse === null || !sse.isConnected) {
          return;
        }
        // extend data only to a specific user
        if (id === userId && typeof userData === "object") {
          data = { ...data, ...userData };
        }
        return sse.send({
          data: { event, data },
          retry: SSE_RETRY_MS,
        });
      })
      .toArray();
    await Promise.all(promises);
  }
}
