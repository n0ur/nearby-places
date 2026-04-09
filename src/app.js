import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifySse from "@fastify/sse";
import path from "node:path";
import { roomRoutes } from "./routes/room.js";
import { locationRoutes } from "./routes/location.js";

const isDev = process.env.NODE_ENV !== "production";

export const fastify = Fastify({
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

await fastify.register(fastifySse);

fastify.setErrorHandler((error, request, reply) => {
  console.log(error);
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

fastify.register(roomRoutes);
fastify.register(locationRoutes);
