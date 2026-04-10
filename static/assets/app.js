const DEFAULT_ZOOM = 12;
const DEFAULT_POSITION = { lat: 52.4743213, lng: 13.4276562 };
const mapElement = document.querySelector("gmp-map");
const locations = new Map();

let libMarker;

async function initMap() {
  // load libraries
  await google.maps.importLibrary("maps");
  libMarker = await google.maps.importLibrary("marker");

  // set the map
  mapElement.innerMap.setOptions({
    mapTypeControl: false,
    fullscreenControl: false,
    draggableCursor: "crosshair",
  });
  mapElement.innerMap.setCenter(DEFAULT_POSITION);

  // elements
  const inputText = document.getElementById("address");
  document.getElementById("submit").addEventListener("click", () => {
    const request = new Request(location.href + "/location", {
      method: "POST",
      body: inputText.value,
    });

    fetch(request)
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        inputText.value = data.formatted_address;
      })
      .catch((e) => {
        inputText.value = "";
        console.error(e);
      });
  });
  document.getElementById("clear").addEventListener("click", () => {
    inputText.value = "";
  });

  setupEventSource();
}

initMap();

function setupEventSource() {
  const eventSource = new EventSource(location.href + "/events");

  eventSource.onerror = (error) => {
    console.error(error);
  };

  eventSource.onmessage = (event) => {
    let response;
    try {
      response = JSON.parse(event.data);
    } catch (e) {
      console.error(e);
    }

    if (!response.event) {
      return;
    }

    const location = response.data;
    switch (response.event) {
      case "location_created":
        createMarker(location);
        break;
      case "location_deleted":
        deleteMarker(location);
        break;
      default:
        console.log("Unknown event: ", response.event);
    }
  };
}

function createMarker({ id, position, formatted_address }) {
  const { AdvancedMarkerElement } = libMarker;
  const marker = new AdvancedMarkerElement({
    position,
  });
  mapElement.append(marker);

  locations.set(id, { marker });
  return marker;
}

function deleteMarker({ id, position, formatted_address }) {
  if (!locations.has(id)) {
    console.error("Marker not found", id);
  }
  const { marker } = locations.get(id);
  marker.map = null;

  locations.delete(id);
}

function updateBounds() {
  const bounds = new google.maps.LatLngBounds();
  for (const [, { marker }] of locations) {
    bounds.extend(marker.position);
  }
  // When there's only one marker, fitBounds() zooms to the maximum zoom level
  if (locations.size === 1) {
    mapElement.innerMap.setCenter([...locations.values()][0].position);
  } else {
    mapElement.innerMap.fitBounds(bounds);
  }
  mapElement.innerMap.setZoom(DEFAULT_ZOOM);
}
