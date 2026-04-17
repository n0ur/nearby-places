import axios from "axios";
import { Client } from "@googlemaps/google-maps-services-js";
import {
  NotFoundError,
  ServiceError,
  ValidationError,
} from "../models/errors.js";
import { getPosition } from "../helpers.js";
import { center } from "@turf/center";
import { points } from "@turf/helpers";

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

// params: { type: string, locations }
// other params: { opennow: boolean, rankBy }
export async function searchNearby(locations, params) {
  if (locations.length === 0) {
    throw new ValidationError("No locations found, create one first.");
  }

  locations = locations.map((l) => [l.position.lng, l.position.lat]);

  let location;
  if (locations.length > 1) {
    location = center(points(locations));
  } else {
    location = locations[0];
  }

  const request = {
    params: {
      key: process.env.GOOGLE_MAPS_API_KEY,
      location,
      ...params,
    },
  };

  let response;
  try {
    response = await client.placesNearby(request);
  } catch (e) {
    throw new ServiceError(e.response.data.error_message, e.status);
  }

  if (response.data.status === "ZERO_RESULTS") {
    throw new NotFoundError("No places found");
  }
  return response.data.results;
}
