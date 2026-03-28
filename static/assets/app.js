async function initMap() {
  if (!navigator.geolocation) {
    handleLocationError(false);
    return;
  }

  // load libraries
  const [, geocoding, { AdvancedMarkerElement }] = await Promise.all([
    google.maps.importLibrary("maps"),
    google.maps.importLibrary("geocoding"),
    google.maps.importLibrary("marker"),
  ]);

  // html elements
  const inputText = document.getElementById("address");
  const mapElement = document.querySelector("gmp-map");

  // arguments used in functions below
  const args = {
    addresses: new Map(),
    response: document.getElementById("response"),
    mapElement,
    AdvancedMarkerElement,
  };

  const geocoder = new geocoding.Geocoder();
  document.getElementById("submit").addEventListener("click", () => {
    geocoder
      .geocode({ address: inputText.value })
      .then((response) => {
        const { results } = response;
        const first = results[0];
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
}

function renderAddresses(args) {
  const { response, addresses } = args;
  response.innerHTML = "";

  const list = createList(
    [...addresses].map((x) => x[0]),
    (item) => {
      if (addresses.size <= 1) {
        console.error("Cannot delete last address, add a new one first");
        return;
      }
      const marker = addresses.get(item);
      marker.map = null;
      addresses.delete(item);
      updateBounds(args);
      renderAddresses(args);
    },
  );
  response.append(list);
}

function updateBounds({ mapElement, addresses }) {
  const bounds = new google.maps.LatLngBounds();
  for (const [, marker] of addresses) {
    const pos = marker.position;
    const lat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
    const lng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
    bounds.extend({ lat, lng });
  }
  // When there's only one marker, fitBounds() zooms to the maximum zoom level
  if (addresses.size === 1) {
    const pos = [...addresses.values()][0].position;
    mapElement.innerMap.setCenter(pos);
    mapElement.innerMap.setZoom(15);
  } else {
    mapElement.innerMap.fitBounds(bounds);
  }
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
