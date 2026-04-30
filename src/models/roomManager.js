import { NotFoundError, ServiceError } from "./errors.js";
import { Room } from "./room.js";

class RoomManager {
  constructor() {
    this.rooms = new Map();
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

  createRoom(id) {
    const room = new Room(id, this.getLogger());
    this.rooms.set(id, room);
    room.notificationService.notify("room_created", { roomId: id });
    this.getLogger().info(`Room created ${id}`);
    return room;
  }

  deleteRoom(id) {
    const room = this.rooms.get(id);
    if (room) {
      this.rooms.delete(id);
      room.notificationService.notify("room_deleted", { roomId: id });
      this.getLogger().info(`Room deleted ${id}`);
    }
  }

  getRoom(id) {
    const room = this.rooms.get(id);
    if (!room) {
      throw new NotFoundError("Room not found");
    }
    return room;
  }

  hasRoom(id) {
    return this.rooms.has(id);
  }
}

export const roomManager = new RoomManager();
