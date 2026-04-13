export class NotificationService {
  constructor() {
    this.users = new Map(); // <userId, reply>
  }

  createUser(userId, sse) {
    this.users.set(userId, sse);
  }

  deleteUser(userId) {
    this.users.delete(userId);
  }

  async notify(event, data) {
    // TODO: fix self notification
    const promises = [...this.users.values()].map((sse) => {
      if (sse === null) {
        console.log("Reply is null ... /events was not called?");
        return;
      }
      sse.send({
        data,
        retry: 1000,
      });
    });
    await Promise.all(promises);
  }
}
