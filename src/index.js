import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyWs from "@fastify/websocket";
import path from "node:path";
import { client } from "./gmapsClient.js";
import { readFileSync } from "node:fs";

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
  fastify.get("/addr", { websocket: true }, (socket, req) => {
    socket.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("message received", data);
        //socket.send(JSON.stringify({ status: 'ok', data: 'hi from server' }))
      } catch (e) {
        console.error("Could not parse JSON:" + message.toString());
      }
    });
  });
});

fastify.get("/", (req, res) => {
  const html = readFileSync(
    path.join(import.meta.dirname, "../static/index.html"),
    "utf8",
  );

  const injected = html
    .replace("{{GOOGLE_MAPS_API_KEY}}", process.env.GOOGLE_MAPS_API_KEY || "")
    .replace("{{WS_ENDPOINT}}", process.env.WS_ENDPOINT || "");

  res.type("text/html").send(injected);
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
