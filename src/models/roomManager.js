import { NotFoundError } from "./errors.js";
import { Room } from "./room.js";

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(id) {
    const room = new Room(id);
    this.rooms.set(id, room);
    room.notificationService.notify("room_created", { roomId: id });
    return room;
  }

  deleteRoom(id) {
    const room = this.rooms.get(id);
    if (room) {
      this.rooms.delete(id);
      room.notificationService.notify("room_deleted", { roomId: id });
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
