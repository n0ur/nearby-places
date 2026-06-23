import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifySse from "@fastify/sse";
import path from "node:path";
import { roomRoutes } from "./routes/room.js";
import { locationRoutes } from "./routes/location.js";
import { roomDatastore } from "./models/roomDatastore.js";
import { cleanupQueue } from "./cleanupQueue.js";
import { bot } from "./services/telegramBot.js";

export const fastify = Fastify({
  logger: {
    level: "info",
  },
});

await fastify.register(fastifySse);

const logger = fastify.log.child({ component: "roomEvents" });
roomDatastore.setLogger(logger);
cleanupQueue.setLogger(logger);

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

bot.api.config.use((prev, method, payload, signal) => {
  logger.trace({ method, payload: JSON.stringify(payload) }, "Telegram API");
  return prev(method, payload, signal);
});

bot.start();
