import axios from "axios";
import { Client } from "@googlemaps/google-maps-services-js";
import { PlacesClient } from "@googlemaps/places";
import { NotFoundError, ServiceError } from "../models/errors.js";
import { getPosition } from "../helpers.js";

const client = new Client(axios.create({}));

const placesClient = new PlacesClient({
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
});

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

// params: { location, radius }
export async function placesNearby(params) {
  const request = {
    params: {
      key: process.env.GOOGLE_MAPS_API_KEY,
      ...params,
    },
  };

  let response;
  try {
    response = await client.placesNearby(request);
  } catch (e) {
    if (e.response) {
      throw new ServiceError(e.response.data.error_message, e.status);
    }
    throw new ServiceError(e);
  }

  if (response.data.status === "ZERO_RESULTS") {
    throw new NotFoundError("No places found");
  }
  return response.data.results;
}

export async function searchNearby(circle) {
  const request = {
    maxResultCount: 10,
    //rankPreference: "DISTANCE",
    locationRestriction: {
      circle,
    },
    includedTypes: ["restaurant"],
  };

  let response;
  try {
    response = await placesClient.searchNearby(request, {
      otherArgs: {
        headers: {
          "X-Goog-FieldMask": "places.displayName",
        },
      },
    });
    return response[0].places;
  } catch (e) {
    throw new ServiceError(e);
  }
}
