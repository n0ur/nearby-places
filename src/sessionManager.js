import { EventEmitter } from "node:events";
import { Session } from "./session.js";

class SessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
  }

  getSession(id) {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error("Session not found");
    }
    return session;
  }

  initSession(id, { onUserJoined, onPositionSaved }) {
    if (this.sessions.get(id)) {
      return;
    }
    const session = new Session(id);
    this.sessions.set(id, session);
    session.on("user_joined", onUserJoined);
    session.on("position_saved", onPositionSaved);
  }
}

export const sessionManager = new SessionManager();
