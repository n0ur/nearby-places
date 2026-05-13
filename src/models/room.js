import { Location } from "./location.js";
import { NotFoundError, ValidationError } from "./errors.js";
import { geometryService } from "../services/geometry.js";
import { parsePosition } from "../helpers.js";

export class Room {
  constructor(roomId, logger, notificationService) {
    this.id = roomId;
    this.logger = logger;
    this.notificationService = notificationService;
    this.users = new Map(); // Map<userId, locations>
  }

  registerUser(userId, sse) {
    this.notificationService.addListener(userId, sse);
    this.logger.info({ event: "user_registered", userId }, "Event emitted");
  }

  deregisterUser(userId) {
    this.notificationService.removeListener(userId);
    this.logger.info({ event: "user_deregistered", userId }, "Event emitted");
  }

  joinRoom(userId) {
    this.users.set(userId, []);
    const locations = this.getAllLocations();
    const circle = geometryService.calculateCircle(locations);
    this.notificationService.notify("user_joined", {
      roomId: this.id,
      userId,
      locations: [],
      circle: null,
    });
    this.notificationService.notifyId(userId, "location_created", {
      roomId: this.id,
      userId,
      locations,
      circle,
    });
    this.logger.info(
      { event: "user_joined", roomId: this.id, userId },
      "Event emitted",
    );
    return userId;
  }

  leaveRoom(userId) {
    this.validate(userId);
    const locations = this.users.get(userId).map((l) => l.serialize());
    this.users.delete(userId);
    const circle = geometryService.calculateCircle(this.getAllLocations());
    this.notificationService.notify("user_left", {
      roomId: this.id,
      userId,
      locations,
      circle,
    });
    this.logger.info(
      { event: "user_left", roomId: this.id, userId },
      "Event emitted",
    );
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

  createLocation(userId, position, formattedAddress) {
    this.validate(userId);

    position = parsePosition(position);

    const locations = this.getAllLocations();
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
    this.logger.info(
      { event: "location_created", userId, location: JSON.stringify(position) },
      "Event emitted",
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
    this.notificationService.notify("location_deleted", {
      userId,
      locations: [found],
      circle,
    });
    this.logger.info(
      { event: "location_deleted", userId, location: JSON.stringify(found) },
      "Event emitted",
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
