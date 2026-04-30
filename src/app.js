import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifySse from "@fastify/sse";
import path from "node:path";
import { roomRoutes } from "./routes/room.js";
import { locationRoutes } from "./routes/location.js";
import { roomManager } from "./models/roomManager.js";

const isDev = process.env.NODE_ENV !== "production";

export const fastify = Fastify({
  logger: isDev
    ? {
        level: "info",
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
      }
    : {
        level: "info",
      },
});

await fastify.register(fastifySse);

roomManager.setLogger(fastify.log.child({ component: "roomEvents" }));

fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  const statusCode = error.statusCode || 500;
  reply.code(statusCode).send({
    error: error.name,
    message: error.message,
    statusCode,
  });
});

fastify.register(fastifyCookie, {
  secret: process.env.SESSION_SECRET,
  hook: "onRequest",
  parseOptions: {
    //domain: process.env.API_ENDPOINT,
    httpOnly: true,
  },
});

fastify.register(fastifyStatic, {
  root: path.join(import.meta.dirname, "../static/assets"),
});

await fastify.register(import("@fastify/rate-limit"), {
  max: 40,
  timeWindow: "1 minute",
});

fastify.register(roomRoutes);
fastify.register(locationRoutes);
