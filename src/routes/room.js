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

    const injected = readFileSync(
      path.join(import.meta.dirname, "../../static/map.html"),
      "utf8",
    )
      .replace("{{GOOGLE_MAPS_API_KEY}}", process.env.GOOGLE_MAPS_API_KEY || "")
      .replace("{{WS_ENDPOINT}}", process.env.WS_ENDPOINT || "");

    reply.type("text/html").send(injected);
  });

  fastify.get("/room/:id/join", (req, reply) => {
    const roomId = req.params.id;
    const room = roomManager.getRoom(roomId);
    const userId = room.joinRoom();

    reply
      .setCookie("userId", userId, {
        path: "/",
        signed: true,
      })
      .type("text/html")
      .send("OK");
  });

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

      await reply.sse.send({
        data: { message: "Connected" },
        retry: 1000,
      });

      reply.sse.onClose(() => {
        console.log("Connection closed");
        room.deleteUser(userId);
      });
    },
  );
}
