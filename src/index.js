import { fastify } from "./app.js";

try {
  const port = parseInt(process.env.SERVER_PORT, 10) || 3000;
  await fastify.listen({ port, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
