import * as turf from "@turf/turf";

const DEFAULT_RADIUS = 1000; // 1 km
const DEFAULT_UNIT = "meters";

class GeometryService {
  // input: Locations[]
  calculateCircle(locations) {
    if (locations.length === 0) {
      return null;
    }

    if (locations.length === 1) {
      return {
        center: locations[0].position,
        radius: DEFAULT_RADIUS,
      };
    }

    const ps = locations.map((l) => [l.position.lng, l.position.lat]);

    if (locations.length === 2) {
      const point1 = turf.point(ps[0]);
      const point2 = turf.point(ps[1]);
      const center = turf.midpoint(point1, point2);
      const distance = turf.distance(point1, point2, { units: DEFAULT_UNIT });

      const [lng, lat] = center.geometry.coordinates;
      return {
        center: { lng, lat },
        radius: distance / 2,
      };
    }

    const points = turf.points(ps);
    const polygon = turf.convex(points);
    const center = turf.centroid(polygon); // turf.centerOfMass(hull)

    let maxDistance = 0;
    points.features.forEach((pt) => {
      const d = turf.distance(center, pt, { units: DEFAULT_UNIT });
      if (d > maxDistance) maxDistance = d;
    });

    const [lng, lat] = center.geometry.coordinates;
    return { center: { lat, lng }, radius: maxDistance };
  }
}

export const geometryService = new GeometryService();
