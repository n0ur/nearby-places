# nearby-places

[WIP]

Given several locations on a map, the app searches for nearby places (via Google Maps) that minimize travel distance for everyone. For example, a group of friends is scattered across the city and wants to find a central meeting spot. The "center" is calculated using geometric median.

## Tools & Setup

Google Maps Platform provides access to the following APIs and services:

- Maps JavaScript API: Builds a dynamic and customized map.
- Geocoding Service: Translates an address into a geographic coordinates (longitude, latitude).
- Places API: Loads Place information, searches nearby places within a radius, among other things.

An API key is necessary to access these APIs, the instructions are provided [here](https://developers.google.com/maps/documentation/javascript/get-api-key). After an API key is created, it's suggested to add resitrictions to prevent unauthorized access, which can be done in the GCP / APIs & Services / Credentials.

### Map

To add a map on the page, first load the Maps JavaScript API (passing on the API key), add the map using a custom web components element `<gmp-map>`, then load the maps library and initialize it.

- Zoom: Larger zoom values correspond to a higher resolution.
- `setCenter(position)` on a map after loading it.

### Markers

to add a marker to the map, create an `AdvancedMarkerElement({ position })`, then append it to the map with `mapElement.append(marker)`. To remove it: `marker.map = null`

After a marker is added to the map, the map's bounds have to be updated to show the marker. If there are multiple markers, we'd do something like this:

```js
const bounds = new google.maps.LatLngBounds();
for (const marker of markers) {
  bounds.extend(marker.position);
}
mapElement.fitBounds(bounds);
```

### Drawing on the map

Shapes like polylines, polygons, circles and info windows can be drawn on the map.

## Basic knowledge

TODO

## Geospatial algorithms

TODO
