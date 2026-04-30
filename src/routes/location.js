import { geocode } from "../services/gmaps.js";
import { validateUserInRoom, validateSession } from "./hooks.js";
import { roomManager } from "../models/roomManager.js";

export async function locationRoutes(fastify) {
  fastify.post(
    "/room/:id/current_position",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            position: {
              type: "object",
              properties: {
                lat: {
                  type: "number",
                },
                lng: {
                  type: "number",
                },
              },
            },
          },
        },
      },
      preHandler: async (req) => {
        const { userId, room } = validateSession(req, roomManager);
        validateUserInRoom(room, userId);
        req.userId = userId;
        req.room = room;
      },
    },
    async (req, reply) => {
      const location = req.room.createLocation(
        req.userId,
        req.body.position,
        "GPS",
      );
      return reply.send(location.serialize());
    },
  );

  fastify.post(
    "/room/:id/location",
    {
      schema: {
        body: {
          type: "object",
          properties: {
            address: {
              type: "string",
            },
          },
        },
      },
      preHandler: async (req) => {
        const { userId, room } = validateSession(req, roomManager);
        validateUserInRoom(room, userId);
        req.userId = userId;
        req.room = room;
      },
    },
    async (req, reply) => {
      const data = await geocode(req.body);
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
