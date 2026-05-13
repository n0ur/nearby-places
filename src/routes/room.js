import path from "node:path";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { roomDatastore } from "../models/roomDatastore.js";
import { validateSession } from "./hooks.js";
import { placesNearby } from "../services/gmaps.js";
import { NotificationService } from "../services/notificationService.js";

export async function roomRoutes(fastify) {
  fastify.get("/", (req, res) => {
    const html = readFileSync(
      path.join(import.meta.dirname, "../../static/index.html"),
      "utf8",
    );
    res.type("text/html").send(html);
  });

  fastify.get("/room/:id", (req, reply) => {
    const roomId = req.params.id;

    if (!roomDatastore.hasRoom(roomId)) {
      roomDatastore.createRoom(roomId, new NotificationService());
    }

    const injected = readFileSync(
      path.join(import.meta.dirname, "../../static/room.html"),
      "utf8",
    ).replace("{{GOOGLE_MAPS_API_KEY}}", process.env.GOOGLE_MAPS_API_KEY || "");

    const userId = crypto.randomUUID();
    reply
      .setCookie("userId", userId, {
        path: "/",
        signed: true,
      })
      .type("text/html")
      .send(injected);
  });

  fastify.get(
    "/room/:id/events",
    {
      sse: true,
      preHandler: async (req) => {
        const { userId, room } = validateSession(req, roomDatastore);
        req.userId = userId;
        req.room = room;
      },
    },
    async (req, reply) => {
      const { userId, room } = req;

      room.registerUser(userId, reply.sse);
      room.joinRoom(userId);

      reply.sse.keepAlive();
      await reply.sse.send({
        data: { event: "connected", data: { userId } },
        retry: 1000,
      });

      reply.sse.onClose(async () => {
        room.leaveRoom(userId);
        room.deregisterUser(userId);
      });
    },
  );

  fastify.get(
    "/room/:id/places",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            radius: {
              type: "number",
            },
            lat: {
              type: "number",
            },
            lng: {
              type: "number",
            },
            type: {
              type: "string",
              enum: ["restaurant", "bar", "cafe"],
              default: "restaurant",
            },
            opennow: {
              type: "boolean",
              default: true,
            },
          },
          required: ["radius", "lng", "lat"],
        },
      },
      preHandler: async (req) => {
        const { userId, room } = validateSession(req, roomDatastore);
        req.userId = userId;
        req.room = room;
      },
    },
    async (req, reply) => {
      const { lat, lng, opennow, radius, type } = req.query;
      const params = {
        location: { lng, lat },
        radius,
        type,
        opennow,
      };
      const data = await placesNearby(params);
      req.room.notificationService.notify("places_found", {
        userId: req.userId,
        search: params,
        places: data,
      });
      req.room.logger.info(
        { event: "places_found", userId: req.userId, size: data.length },
        "Event emitted",
      );
      reply.type("application/json").send(data);
    },
  );
}
