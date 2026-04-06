import { EventEmitter } from "node:events";
import crypto from "node:crypto";

export class Session extends EventEmitter {
  constructor(sessionId) {
    super();
    this.sessionId = sessionId;
    this.users = new Map();
  }

  addUser(socket) {
    const userSessionId = crypto.randomUUID();
    this.users.set(userSessionId, {
      id: userSessionId,
      position: null,
      socket,
    });
    this.emit("user_joined", { payload: { id: userSessionId, socket } });
    return userSessionId;
  }

  deleteUser(userSessionId) {
    this.users.delete(userSessionId);
    this.emit("user_left", { payload: { id: userSessionId } });
  }

  savePosition(userSessionId, position) {
    const currentUser = this.users.get(userSessionId);
    if (!currentUser) {
      throw new Error("User session not found: " + userSessionId);
    }
    currentUser.position = position;
    const sockets = [];
    const positions = [];
    for (const [id, user] of this.users) {
      sockets.push(user.socket);
      positions.push(user.position);
    }
    this.emit("position_saved", { payload: { sockets, positions } });
  }
}
