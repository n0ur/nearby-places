import { ValidationError } from "../models/errors.js";
import { geocode } from "../services/gmaps.js";
import { validateUserInRoom, validateSession } from "./hooks.js";
import { roomManager } from "../models/roomManager.js";

export async function locationRoutes(fastify) {
  fastify.post(
    "/room/:id/location",
    {
      schema: {
        body: {
          type: "string",
        },
      },
      preHandler: async (req) => {
        const { userId, room } = validateSession(req, roomManager);
        validateUserInRoom(room, userId);
        req.userId = userId;
        req.room = room;
        if (!req.body.trim()) {
          throw new ValidationError("Empty address");
        }
        req.address = req.body;
      },
    },
    async (req, reply) => {
      const data = await geocode(req.address);
      const location = req.room.createLocation(
        req.userId,
        data.location,
        data.formatted_address,
      );
      return reply.send(location.serialize());
    },
  );

  fastify.delete(
    "/room/:id/location/:locId",
    {
      preHandler: async (req) => {
        const { userId, room } = validateSession(req, roomManager);
        validateUserInRoom(room, userId);
        req.userId = userId;
        req.room = room;
      },
    },
    (req, reply) => {
      req.room.deleteLocation(req.userId, req.params.locId);
      return reply.send(req.params.locId);
    },
  );
}
