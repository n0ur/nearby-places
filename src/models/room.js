import { EventEmitter } from "node:events";
import { Location } from "./location.js";
import { NotFoundError } from "./errors.js";

// emits: user_joined, user_left, location_created, location_deleted
export class Room extends EventEmitter {
  constructor(roomId) {
    super();
    this.id = roomId;
    this.users = new Map();
  }

  joinRoom() {
    const userId = crypto.randomUUID();
    this.users.set(userId, {
      locations: [],
      reply: null,
    });
    this.emit("user_joined", { roomId: this.id, userId });
    return userId;
  }

  leaveRoom(userId) {
    this.validate(userId);
    this.users.delete(userId);
    this.emit("user_left", { roomId: this.id, userId });
  }

  async notifyUsers(event, data) {
    const promises = [...this.users.values()].map(({ reply }) => {
      if (reply === null) {
        console.log("Reply is null ... /events was not called?");
        return;
      }
      reply.sse.send({
        data: { event, data },
        retry: 1000,
      });
    });
    // TODO: how to handle errors?
    try {
      await Promise.all(promises);
    } catch (e) {
      console.error(e);
    }
  }

  getUserLocations(userId) {
    this.validate(userId);
    const user = this.users.get(userId);
    return user.locations.map((l) => l.serialize());
  }

  getLocations() {
    return [...this.users.values()].flatMap(({ locations }) =>
      locations.map((l) => l.serialize()),
    );
  }

  createLocation(userId, position, formattedAddress) {
    this.validate(userId);
    const location = new Location(
      crypto.randomUUID(),
      userId,
      position,
      formattedAddress,
    );

    const { locations } = this.users.get(userId);
    locations.push(location);

    this.emit("location_created", location.serialize());

    return location;
  }

  deleteLocation(userId, locationId) {
    this.validate(userId);

    const { reply, locations } = this.users.get(userId);

    let found = null;
    const filtered = locations.filter((location) => {
      if (location.id === locationId) {
        found = location.serialize();
      }
    });

    if (found === null) {
      throw new NotFoundError("Location not found");
    }

    this.users.set(userId, {
      reply,
      locations: filtered,
    });

    this.emit("location_deleted", found);
  }

  deleteUser(userId) {
    this.validate(userId);
    this.users.delete(userId);
  }

  hasUser(userId) {
    return this.users.has(userId);
  }

  userHasLocation(userId, locationId) {
    const { locations } = this.users.get(userId);
    return locations.includes((loc) => loc.id === locationId);
  }

  setReply(userId, reply) {
    this.validate(userId);

    this.users.set(userId, {
      ...this.users.get(userId),
      reply,
    });
    this.emit("data_updated", { userId });
  }

  validate(userId) {
    if (!this.hasUser(userId)) {
      throw new NotFoundError("User doesn't exist");
    }
  }
}
