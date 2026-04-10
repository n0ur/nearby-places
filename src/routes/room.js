import path from "node:path";
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

    const room = roomManager.createRoom(roomId, {
      async onLocationCreated(data) {
        console.log("Location created", data);
        await room.notifyUsers("location_created", data);
      },
      async onLocationDeleted(data) {
        console.log("Location deleted", data);
        await room.notifyUsers("location_deleted", data);
      },
      onUserJoined(user) {
        console.log("User joined", user);
      },
      onUserLeft(user) {
        console.log("User left", user);
      },
    });

    const userId = room.joinRoom();

    const injected = readFileSync(
      path.join(import.meta.dirname, "../../static/room.html"),
      "utf8",
    ).replace("{{GOOGLE_MAPS_API_KEY}}", process.env.GOOGLE_MAPS_API_KEY || "");

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
      const { userId, room } = req; // set in preHandler
      room.setReply(userId, reply);

      reply.sse.keepAlive();

      // TODO fix
      for (const loc of room.getLocations()) {
        await room.notifyUsers("location_created", loc);
      }

      await reply.sse.send({
        data: { message: "Connected" },
        retry: 1000,
      });

      reply.sse.onClose(async () => {
        console.log("Connection closed");
        const locations = room.getUserLocations(userId);
        room.deleteUser(userId);
        for (const loc of locations) {
          await room.notifyUsers("location_deleted", loc);
        }
      });
    },
  );
}
