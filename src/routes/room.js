import path from "node:path";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { roomManager } from "../models/roomManager.js";
import { validateSession } from "./hooks.js";

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

    if (!roomManager.hasRoom(roomId)) {
      roomManager.createRoom(roomId);
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

  // how to do error handling for SSE
  fastify.get(
    "/room/:id/events",
    {
      sse: true,
      preHandler: async (req) => {
        const { userId, room } = validateSession(req, roomManager);
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
        console.log("Connection closed");
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
        const { userId, room } = validateSession(req, roomManager);
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
      const data = await req.room.getNearbyPlaces(req.userId, params);
      reply.type("application/json").send(data);
    },
  );
}
