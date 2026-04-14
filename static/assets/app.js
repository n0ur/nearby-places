const DEFAULT_ZOOM = 12;
const DEFAULT_POSITION = { lat: 52.4743213, lng: 13.4276562 };
const mapElement = document.querySelector("gmp-map");
const locationsMap = new Map(); // Map<locationId, { marker }>

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

    if (!response.event || !response.data) {
      return;
    }

    const locations = response.data.locations;
    switch (response.event) {
      case "location_created":
      case "user_joined":
        createMarker(locations);
        break;
      case "location_deleted":
        deleteMarker(locations);
        break;
      default:
        console.log("Unknown event: ", response.event);
    }
  };
}

function createMarker(locations) {
  const { AdvancedMarkerElement } = libMarker;
  for (const location of locations) {
    const { id, position, formatted_address } = location;
    const marker = new AdvancedMarkerElement({
      position,
    });
    mapElement.append(marker);
    locationsMap.set(id, { marker, formatted_address });
  }
}

function deleteMarker(locations) {
  for (const location of locations) {
    const { id } = location;
    if (!locationsMap.has(id)) {
      console.error("Marker not found", id);
    }
    const { marker } = locationsMap.get(id);
    marker.map = null;

    locationsMap.delete(id);
  }
}

function updateBounds() {
  const bounds = new google.maps.LatLngBounds();
  for (const [, { marker }] of locationsMap) {
    bounds.extend(marker.position);
  }
  // When there's only one marker, fitBounds() zooms to the maximum zoom level
  if (locationsMap.size === 1) {
    mapElement.innerMap.setCenter([...locationsMap.values()][0].position);
  } else {
    mapElement.innerMap.fitBounds(bounds);
  }
  mapElement.innerMap.setZoom(DEFAULT_ZOOM);
}
