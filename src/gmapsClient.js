import axios from "axios";
import { Client } from "@googlemaps/google-maps-services-js";

const instance = axios.create({
  // timeout, headers, etc
});

const client = new Client(instance);

export { client };
