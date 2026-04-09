import { NotFoundError } from "./errors.js";
import { Room } from "./room.js";
import { EventEmitter } from "node:events";

// emits room_created, room_deleted
class RoomManager extends EventEmitter {
  constructor() {
    super();
    this.rooms = new Map();
  }

  createRoom(
    id,
    { onLocationCreated, onLocationDeleted, onUserJoined, onUserLeft },
  ) {
    const room = this.rooms.get(id);
    if (room) {
      return room;
    }
    const created = new Room(id);
    this.rooms.set(id, created);
    created.on("location_created", onLocationCreated);
    created.on("location_deleted", onLocationDeleted);
    created.on("user_joined", onUserJoined);
    created.on("user_left", onUserLeft);
    this.emit("room_created", { roomId: id });
    return created;
  }

  deleteRoom(id) {
    const room = this.rooms.get(id);
    if (room) {
      room.removeAllListeners();
      this.rooms.delete(id);
      this.emit("room_deleted", { roomId: id });
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

roomManager.on("room_created", (data) => {
  console.log("Room created", data);
});

roomManager.on("room_deleted", (data) => {
  console.log("Room deleted", data);
});
