import axios from "axios";
import { Client } from "@googlemaps/google-maps-services-js";
import { NotFoundError, ServiceError } from "../models/errors.js";
import { getPosition } from "../helpers.js";

const instance = axios.create({
  // timeout, headers, etc
});

const client = new Client(instance);

// params: { address: string }
export async function geocode(params) {
  const request = {
    params: {
      key: process.env.GOOGLE_MAPS_API_KEY,
      ...params,
    },
  };

  let response;
  try {
    response = await client.geocode(request);
  } catch (e) {
    throw new ServiceError(e.response.data.error_message, e.status);
  }

  if (response.data.status === "ZERO_RESULTS") {
    throw new NotFoundError("Location not found");
  }
  const [first] = response.data.results;
  return {
    formatted_address: first.formatted_address,
    location: getPosition(first.geometry.location),
  };
}

export function nearbyPlaces() {}
