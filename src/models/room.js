import { Location } from "./location.js";
import { NotFoundError } from "./errors.js";
import { NotificationService } from "../services/notificationService.js";
import { searchNearby } from "../services/gmaps.js";

export class Room {
  constructor(roomId) {
    this.id = roomId;
    this.notificationService = new NotificationService();
    this.users = new Map(); // Map<userId, locations>
    this.nearbyPlaces = null;
  }

  registerUser(userId, sse) {
    this.notificationService.addListener(userId, sse);
  }

  deregisterUser(userId) {
    this.notificationService.removeListener(userId);
  }

  joinRoom(userId) {
    this.users.set(userId, []);
    const locations = this.getAllLocations();
    this.notificationService.notify("user_joined", {
      roomId: this.id,
      userId,
      locations,
    });
    return userId;
  }

  leaveRoom(userId) {
    this.validate(userId);
    const locations = this.users.get(userId).map((l) => l.serialize());
    this.users.delete(userId);
    this.notificationService.notify("user_left", {
      roomId: this.id,
      userId,
      locations,
    });
  }

  getUserLocations(userId) {
    this.validate(userId);
    return this.users.get(userId).map((l) => l.serialize());
  }

  getAllLocations() {
    return [...this.users.values()].flatMap((locations) =>
      locations.map((l) => l.serialize()),
    );
  }

  async getNearbyPlaces() {
    if (this.nearbyPlaces) {
      return this.nearbyPlaces;
    }

    const locations = this.getAllLocations();

    this.nearbyPlaces = await searchNearby(locations, {
      type: "bar",
      radius: 1000,
      opennow: true,
    });
    return this.nearbyPlaces;
  }

  createLocation(userId, position, formattedAddress) {
    this.validate(userId);
    const location = new Location(
      crypto.randomUUID(),
      userId,
      position,
      formattedAddress,
    );
    this.users.get(userId).push(location);
    this.notificationService.notify("location_created", {
      userId,
      locations: [location.serialize()],
    });
    return location;
  }

  deleteLocation(userId, locationId) {
    this.validate(userId);

    const locations = this.users.get(userId);

    let found = null;
    const filtered = locations.filter((location) => {
      if (location.id === locationId) {
        found = location.serialize();
        return false;
      }
      return true;
    });

    if (found === null) {
      throw new NotFoundError("Location not found");
    }

    this.users.set(userId, filtered);

    this.notificationService.notify("location_deleted", {
      userId,
      locations: [found],
    });
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

  validate(userId) {
    if (!this.hasUser(userId)) {
      throw new NotFoundError("User doesn't exist");
    }
  }
}
