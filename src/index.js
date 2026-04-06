import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWs from "@fastify/websocket";
import path from "node:path";
import { client } from "./gmapsClient.js";
import { readFileSync } from "node:fs";
import { sessionManager } from "./sessionManager.js";

const isDev = process.env.NODE_ENV !== "production";

const fastify = Fastify({
  logger: isDev
    ? {
        level: "warn",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
      }
    : { level: "info" },
});

fastify.register(fastifyStatic, {
  root: path.join(import.meta.dirname, "../static/assets"),
});

fastify.register(fastifyWs);

fastify.register(async function (fastify) {
  fastify.get("/ws/:code", { websocket: true }, (socket, req) => {
    const session = sessionManager.getSession(req.params.code);
    const userSessionId = session.addUser(socket);
    socket.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "position") {
          session.savePosition(userSessionId, data.payload);
        }
      } catch (e) {
        console.error("Could not parse JSON:");
        console.error(e);
      }
    });

    socket.on("close", () => {
      session.deleteUser(userSessionId);
    });
  });
});

fastify.get("/map/:code", (req, res) => {
  const code = req.params.code;
  const html = readFileSync(
    path.join(import.meta.dirname, "../static/map.html"),
    "utf8",
  );

  sessionManager.initSession(code, {
    onUserJoined: ({ payload }) => {
      const { socket, id } = payload;
      socket.send(JSON.stringify({ type: "connected", payload: id }));
    },
    onPositionSaved: ({ payload }) => {
      const { sockets, positions } = payload;
      for (const socket of sockets) {
        socket.send(
          JSON.stringify({ type: "position_saved", payload: positions }),
        );
      }
    },
  });

  const injected = html
    .replace("{{GOOGLE_MAPS_API_KEY}}", process.env.GOOGLE_MAPS_API_KEY || "")
    .replace("{{WS_ENDPOINT}}", process.env.WS_ENDPOINT || "");

  res.type("text/html").send(injected);
});

fastify.get("/", (req, res) => {
  const html = readFileSync(
    path.join(import.meta.dirname, "../static/index.html"),
    "utf8",
  );
  res.type("text/html").send(html);
});

fastify.get(
  "/find",
  {
    schema: {
      querystring: {
        type: "object",
        properties: {
          lng: { type: "number" },
          lat: { type: "number" },
          radius: { type: "number" },
          type: { type: "string", enum: ["bar", "restaurant", "cafe"] },
        },
      },
    },
  },
  async (req, res) => {
    const { lng, lat, radius, type } = req.query;

    const request = {
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY,
        location: { lng, lat },
        radius,
        type,
      },
    };
    client
      .placesNearby(request)
      .then((res) => {
        console.log(res.data);
      })
      .catch((e) => {
        console.log(e.response.data);
      });

    return res.send("OK\n");
  },
);

try {
  const port = parseInt(process.env.SERVER_PORT, 10) || 3000;
  await fastify.listen({ port });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
