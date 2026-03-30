const DEFAULT_ZOOM = 12;

const data = {
  //"schoenefeld": { position: { lat: 52.389, lng: 13.5037 } },
  default: { position: { lat: 52.4743213, lng: 13.4276562 }, marker: null }, // hermannstr
  kreuzberg: { position: { lat: 52.4983442, lng: 13.4065791 }, marker: null },
  koepenick: {
    position: { lat: 52.44260689999999, lng: 13.5822741 },
    marker: null,
  },
  schoeneberg: {
    position: { lat: 52.49042660000001, lng: 13.3602846 },
    marker: null,
  },
  bergmannkiez: {
    position: { lat: 52.4887869, lng: 13.3928533 },
    marker: null,
  },
};

const addresses = new Map(Object.entries(data));

const args = {
  addresses,
  response: document.getElementById("response"),
  mapElement: document.querySelector("gmp-map"),
  // get assigned when drawing
  polygon: null,
  circle: null,
  // get assigned after libraries load
  AdvancedMarkerElement: null,
  geometry: null,
};

async function initMap() {
  // load libraries
  const [, geocoding, { AdvancedMarkerElement }, geometry] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("geocoding"),
    google.maps.importLibrary("marker"),
    google.maps.importLibrary("geometry"),
  ]);
  args.geometry = geometry;
  args.AdvancedMarkerElement = AdvancedMarkerElement;

  // set the map
  args.mapElement.innerMap.setCenter(args.addresses.get("default").position);
  args.mapElement.innerMap.setOptions({
    mapTypeControl: false,
    fullscreenControl: false,
    draggableCursor: "crosshair",
  });

  const inputText = document.getElementById("address");
  const geocoder = new geocoding.Geocoder();
  document.getElementById("submit").addEventListener("click", () => {
    geocoder
      .geocode({ address: inputText.value })
      .then((response) => {
        const { results } = response;
        const first = results[0];
        if (args.addresses.get(first.formatted_address)) {
          return;
        }
        addMarker(first.formatted_address, first.geometry.location, args);
      })
      .catch((e) => {
        console.error(
          "Geocode was not successful for the following reason: " + e,
        );
      });
  });

  document.getElementById("clear").addEventListener("click", () => {
    inputText.value = "";
  });

  document.getElementById("find").addEventListener("click", () => {});
}

initMap();

function getCurrentPosition(args) {
  if (!navigator.geolocation) {
    handleLocationError(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      args.mapElement.innerMap.setCenter(pos);
      addresses.set("current", { position: pos, marker: null });
      //addMarker("default", pos, args);
    },
    () => {
      handleLocationError(true);
    },
  );
}

function addMarker(label, position, args) {
  const { AdvancedMarkerElement, mapElement, addresses } = args;
  const marker = new AdvancedMarkerElement({ position });
  mapElement.append(marker);
  addresses.set(label, { position, marker });
  updateBounds(args);
  renderAddresses(args);
}

function removeMarker(item, args) {
  if (args.addresses.size <= 1) {
    console.error("Cannot delete last address, add a new one first");
    return;
  }
  const { marker } = args.addresses.get(item);
  marker.map = null;
  args.addresses.delete(item);
  updateBounds(args);
  renderAddresses(args);
}

function addAllMarkers(args) {
  const { AdvancedMarkerElement, mapElement, addresses } = args;
  const bounds = new google.maps.LatLngBounds();
  // update the bounds
  for (const [label, obj] of args.addresses) {
    const position = getPosition(obj);

    const marker = new AdvancedMarkerElement({ position });
    mapElement.append(marker);
    addresses.set(label, { ...obj, marker });

    bounds.extend(position);
  }

  // When there's only one marker, fitBounds() zooms to the maximum zoom level
  if (addresses.size === 1) {
    mapElement.innerMap.setCenter([...addresses.values()][0].position);
  } else {
    mapElement.innerMap.fitBounds(bounds);
  }
  mapElement.innerMap.setZoom(DEFAULT_ZOOM);

  renderAddresses(args);
}

function removeAllMarkers(args) {
  for (const [, obj] of args.addresses) {
    obj.marker?.setMap(null);
  }
  args.response.innerHTML = "";
}

function renderAddresses(args) {
  const { response, addresses } = args;
  response.innerHTML = "";

  const list = createList([...addresses.keys()], (item) =>
    removeMarker(item, args),
  );
  response.append(list);
}

function updateBounds({ mapElement, addresses }) {
  const bounds = new google.maps.LatLngBounds();
  for (const [, obj] of addresses) {
    bounds.extend(obj.position);
  }
  // When there's only one marker, fitBounds() zooms to the maximum zoom level
  if (addresses.size === 1) {
    mapElement.innerMap.setCenter([...addresses.values()][0].position);
  } else {
    mapElement.innerMap.fitBounds(bounds);
  }
  mapElement.innerMap.setZoom(DEFAULT_ZOOM);
}

function getPosition(marker) {
  const pos = marker.position;
  const lat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
  const lng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
  return { lat, lng };
}

function createList(items, onClick) {
  const ul = document.createElement("ul");
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    li.addEventListener("click", () => onClick(item));
    ul.appendChild(li);
  });
  return ul;
}

function handleLocationError(browserHasGeolocation) {
  console.error(
    browserHasGeolocation
      ? "Geolocation permissions denied, using default location"
      : "Error: browser doesnt support geolocation",
  );
}

function drawPolygon(args) {
  const { addresses, mapElement } = args;
  if (addresses.size <= 1) {
    return;
  }

  const positions = [...addresses.values()].map((v) => {
    return v.position;
  });
  console.log(positions);

  //if (args.polygon && geometry.poly.containsLocation(last, args.polygon)) {
  //  console.log("new address is within polygon, not drawing");
  //  return;
  //}
  // TODO: try: find outer paths only, or sort points, or path union
  if (args.polygon) {
    args.polygon.setPaths(positions);
  } else {
    args.polygon = new google.maps.Polygon({
      paths: positions,
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#FF0000",
      fillOpacity: 0.35,
      map: mapElement.innerMap,
    });
  }
}

function drawCircle(args) {
  const { addresses, mapElement, geometry } = args;
  if (addresses.size <= 1) {
    return;
  }
  const positions = [...addresses.values()].map((v) => {
    return v.position;
  });
  // compute area of polygon
  const area = geometry.spherical.computeArea(positions);
  // convert polygon to circle
  const radius = Math.sqrt(area / Math.PI);
  const center = mapElement.innerMap.getBounds().getCenter();
  if (args.circle) {
    args.circle.setRadius(radius);
    args.circle.setCenter(center);
  } else {
    args.circle = new google.maps.Circle({
      center: center,
      radius: radius,
      strokeColor: "#00FF00",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#00FF00",
      fillOpacity: 0.35,
      map: mapElement.innerMap,
    });
  }
}

function shuffleMap(map) {
  const shuffled = new Map();
  const entries = [...map.entries()].sort(() => Math.random() - 0.5);
  entries.forEach(([key, value]) => shuffled.set(key, value));
  return shuffled;
}

// Fisher-Yates shuffle algorithm:
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
