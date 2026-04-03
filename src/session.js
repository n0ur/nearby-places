import { EventEmitter } from "node:events";

export class Session extends EventEmitter {
  constructor(sessionId) {
    super();
    this.sessionId = sessionId;
    this.users = new Map();
  }

  addUser(userSessionId, socket) {
    if (this.users.get(userSessionId)) {
      console.log("User already exists in sessions");
      return this;
    }
    this.users.set(userSessionId, {
      id: userSessionId,
      position: null,
      socket,
    });
    this.emit("user_joined", { payload: { id: userSessionId, socket } });
    return this;
  }

  deleteUser(userSessionId) {
    this.users.delete(userSessionId);
    return this;
  }

  savePosition(userSessionId, position) {
    const currentUser = this.users.get(userSessionId);
    if (!currentUser) {
      throw new Error("User session not found" + userSessionId);
    }
    currentUser.position = position;
    const sockets = [];
    const positions = [];
    for (const [id, { socket, position }] of this.users) {
      sockets.push(socket);
      positions.push(position);
    }
    this.emit("position_saved", { payload: { sockets, positions } });
    return this;
  }
}
