import { NotificationService } from "../services/notificationService.js";
import { SearchService } from "../services/searchService.js";
import {
  constructLegacySearchParams,
  placesNearby,
} from "../services/gmaps.js";
import { NotFoundError, ServiceError } from "./errors.js";
import { Room } from "./room.js";

class RoomDatastore {
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
    const room = new Room(
      id,
      this.logger,
      new NotificationService(),
      new SearchService(constructLegacySearchParams, placesNearby),
    );
    this.rooms.set(id, room);
    this.getLogger().info({ event: "room_created", id }, "Event emitted");
    return room;
  }

  deleteRoom(id) {
    const room = this.rooms.get(id);
    if (room) {
      this.rooms.delete(id);
      this.getLogger().info({ event: "room_deleted", id }, "Event emitted");
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

export const roomDatastore = new RoomDatastore();
