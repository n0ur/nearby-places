import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { geocodeRoutes } from "./routes.js";

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

fastify.register(fastifyStatic, {
  root: path.join(import.meta.dirname, "../static/assets"),
});

fastify.register(geocodeRoutes);
