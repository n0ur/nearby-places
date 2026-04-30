import { Location } from "./location.js";
import { NotFoundError, ValidationError } from "./errors.js";
import { NotificationService } from "../services/notificationService.js";
import { placesNearby } from "../services/gmaps.js";
import { geometryService } from "../services/geometry.js";
import { parsePosition } from "../helpers.js";

export class Room {
  constructor(roomId, logger) {
    this.id = roomId;
    this.notificationService = new NotificationService();
    this.logger = logger;
    this.users = new Map(); // Map<userId, locations>
    this.nearbyPlaces = null;
  }

  getLogger() {
    return this.logger;
  }

  registerUser(userId, sse) {
    this.notificationService.addListener(userId, sse);
    this.getLogger().info(`User registered ${userId}`);
  }

  deregisterUser(userId) {
    this.notificationService.removeListener(userId);
    this.getLogger().info(`User deregistered ${userId}`);
  }

  joinRoom(userId) {
    this.users.set(userId, []);
    this.notificationService.notify("user_joined", {
      roomId: this.id,
      userId,
      locations: [],
      circle: null,
    });
    this.getLogger().info(`User joined ${userId}`);

    const locations = this.getAllLocations();
    const circle = geometryService.calculateCircle(locations);
    this.notificationService.notifyId(userId, "location_created", {
      roomId: this.id,
      userId,
      locations,
      circle,
    });
    this.getLogger().info(`Sent locations to user ${userId}`);
    return userId;
  }

  leaveRoom(userId) {
    this.validate(userId);
    const locations = this.users.get(userId).map((l) => l.serialize());
    this.users.delete(userId);
    this.nearbyPlaces = null;
    const circle = geometryService.calculateCircle(this.getAllLocations());
    this.notificationService.notify("user_left", {
      roomId: this.id,
      userId,
      locations,
      circle,
    });
    this.getLogger().info(`User left ${userId}`);
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

  async getNearbyPlaces(userId, params) {
    // TODO: add caching later
    this.nearbyPlaces = await placesNearby(params);
    this.notificationService.notify("places_found", {
      userId,
      search: params,
      places: this.nearbyPlaces,
    });
    return this.nearbyPlaces;
  }

  createLocation(userId, position, formattedAddress) {
    this.validate(userId);

    position = parsePosition(position);

    const locations = this.getAllLocations();
    // todo: compare locations with distance?
    const exists = locations.find(
      (location) =>
        location.position.lat === position.lat &&
        location.position.lng === position.lng,
    );
    if (exists) {
      throw new ValidationError("Location already exists.");
    }

    const location = new Location(
      crypto.randomUUID(),
      userId,
      position,
      formattedAddress,
    );
    this.users.get(userId).push(location);
    locations.push(location);
    const circle = geometryService.calculateCircle(locations);
    this.notificationService.notify("location_created", {
      userId,
      locations: [location.serialize()],
      circle,
    });
    this.getLogger().info(
      `Location created by ${userId}, ${JSON.stringify(position)}`,
    );
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

    const circle = geometryService.calculateCircle(this.getAllLocations());
    this.nearbyPlaces = null;
    this.notificationService.notify("location_deleted", {
      userId,
      locations: [found],
      circle,
    });
    this.getLogger().info(
      `Location deleted by ${userId}, ${JSON.stringify(found)}`,
    );
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
