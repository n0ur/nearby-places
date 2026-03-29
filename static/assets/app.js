async function initMap() {
  if (!navigator.geolocation) {
    handleLocationError(false);
    return;
  }

  // load libraries
  const [, geocoding, { AdvancedMarkerElement }, geometry] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("geocoding"),
    google.maps.importLibrary("marker"),
    google.maps.importLibrary("geometry"),
  ]);

  // html elements
  const inputText = document.getElementById("address");
  const mapElement = document.querySelector("gmp-map");

  // arguments used in functions below
  const args = {
    addresses: new Map(),
    polygon: null,
    circle: null,
    response: document.getElementById("response"),
    mapElement,
    AdvancedMarkerElement,
    geometry,
  };

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

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      mapElement.innerMap.setCenter(pos);
      mapElement.innerMap.setOptions({
        mapTypeControl: false,
        fullscreenControl: false,
        draggableCursor: "crosshair",
      });
      addMarker("default", pos, args);
    },
    () => {
      handleLocationError(true);
    },
  );
}

initMap();

function addMarker(label, pos, args) {
  const { AdvancedMarkerElement, mapElement, addresses } = args;
  const marker = new AdvancedMarkerElement({
    position: pos,
  });
  mapElement.append(marker);
  addresses.set(label, marker);
  updateBounds(args);
  renderAddresses(args);
  drawPolygon(args);
}

function removeMarker(item, args) {
  const { addresses } = args;
  if (addresses.size <= 1) {
    console.error("Cannot delete last address, add a new one first");
    return;
  }
  const marker = addresses.get(item);
  marker.map = null;
  addresses.delete(item);
  updateBounds(args);
  renderAddresses(args);
  drawPolygon(args);
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
  for (const [, marker] of addresses) {
    bounds.extend(getPosition(marker));
  }
  // When there's only one marker, fitBounds() zooms to the maximum zoom level
  if (addresses.size === 1) {
    const pos = [...addresses.values()][0].position;
    mapElement.innerMap.setCenter(pos);
    mapElement.innerMap.setZoom(13);
  } else {
    mapElement.innerMap.fitBounds(bounds);
  }
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
  const { addresses, mapElement, geometry } = args;
  if (addresses.size <= 1) {
    return;
  }

  const positions = [...addresses.values()].map((v) => getPosition(v));
  const last = positions[positions.length - 1];

  if (args.polygon && geometry.poly.containsLocation(last, args.polygon)) {
    console.log("new address is within polygon, not drawing");
    return;
  }
  // TODO: try: find outer paths only, or sort points, or path union
  const sorted = positions.sort((a, b) => {
    return a.lat - b.lat;
  });

  if (args.polygon) {
    args.polygon.setPaths(sorted);
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

  // compute area of polygon
  const area = geometry.spherical.computeArea(sorted);
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
