import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { client } from "./gmapsClient.js";
import { readFileSync } from "node:fs";

const fastify = Fastify({
  logger: {
    level: "info",
  },
});

fastify.get("/", (req, res) => {
  const html = readFileSync(
    path.join(import.meta.dirname, "../static/index.html"),
    "utf8",
  );
  const injected = html.replace(
    "{{GOOGLE_MAPS_API_KEY}}",
    process.env.GOOGLE_MAPS_API_KEY || "",
  );
  res.type("text/html").send(injected);
});

fastify.register(fastifyStatic, {
  root: path.join(import.meta.dirname, "../static/assets"),
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
  await fastify.listen({ port: 3000 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
