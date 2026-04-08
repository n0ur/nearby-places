# nearby-places

Given several locations on a map, the app searches for nearby places that minimize travel distance for everyone. An example use case: a group of friends is scattered across the city and wants to find a central meeting spot.

## Requirements

- Users join a room by navigating to `/room/<id>`. Rooms are auto-created when a user joins with a new ID.
- Users add locations by searching an address (geocoding) or sharing their current position from the browser.
- Users can delete their own locations (validation using userId).
- All users in a room see the same set of locations in real-time.
- Once a new location is added, the server sends nearby places of all locations via SSE to connected users.
- Locations are automatically deleted when a user disconnects, e.g. refreshes the page.

## API Endpoints

| Method | Path                        | Description                                           |
| ------ | --------------------------- | ----------------------------------------------------- |
| GET    | `/room/:id/join`            | Join a room, returns userId                           |
| POST   | `/room/:id/location`        | Create a location on the map, body: `{address: ".."}` |
| DELETE | `/room/:id/location/:locId` | Delete a location from the map                        |
| GET    | `/room/:id/events`          | SSE stream for real-time updates                      |

## Data Model

Data is stored in-memory (no database).

### RoomManager

Entity

- rooms: Map<room_id, Room>

Operations

- createRoom(id)
- deleteRoom(id)

Events

- room_created: `{ roomId }`
- room_deleted: `{ roomId }`

### Room

Entity

- id: string (unique id)
- users: Map<user_id, Location[]>

Operations

- joinRoom => returns userId
- leaveRoom
- createLocation(userId, address) => returns locationId
- deleteLocation(locationId)
- deleteLocations(userId)

Events

- user_joined: `{ roomId, userId }`
- user_left: `{ roomId, userId }`
- location_created `{ roomId, location: { id, position: { lng, lat }, isOwn: boolean } }`
- location_deleted `{ roomId, locationId }`

### Location

Entity

- id: string (unique id)
- user_id: string
- position: { lat, lng }

## Operations

### Backend

- findPlaces(positions)

### Frontend

- initMap
- createMarker(position)
- deleteMarker(marker)
- drawCircle

### Join Flow

1. GET `/room/:id/join` -> Set-Cookie: userId=xxx
2. Client connects to GET `/room/:id/events` (for Server-Sent Events)
3. All subsequent requests use Cookie header automatically

## Server-Sent Events Messages

Format: `event: <name>\ndata: <json>\n\n`

- location_created: `{ id, position: { lat, lng }, isOwn }`
- location_deleted: `{ id }`
- places: `[{ displayName, location, formattedAddress, googleMapsURI }]`

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
