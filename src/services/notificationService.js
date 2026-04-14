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

  async notify(event, data) {
    const { locations } = data;
    const promises = this.listeners
      .entries()
      .map(([, sse]) => {
        if (sse === null || !sse.isConnected) {
          return;
        }
        return sse.send({
          data: { event, data: { locations } },
          retry: 1000,
        });
      })
      .toArray();
    await Promise.all(promises);
  }
}
