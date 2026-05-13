import { eventBus } from "../eventBus.js";
import { NotFoundError } from "./errors.js";
import { Room } from "./room.js";

class RoomManager {
  constructor(eventBus) {
    this.rooms = new Map();
    this.eventBus = eventBus;
  }

  createRoom(id) {
    const room = new Room(id, eventBus);
    this.rooms.set(id, room);
    this.eventBus.emit("room_created", id);
    return room;
  }

  deleteRoom(id) {
    const room = this.rooms.get(id);
    if (room) {
      this.rooms.delete(id);
      this.eventBus.emit("room_deleted", id);
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

export const roomManager = new RoomManager(eventBus);
