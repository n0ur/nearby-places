const DEFAULT_POSITION = { lat: 52.4743213, lng: 13.4276562 };
const mapElement = document.querySelector("gmp-map");

const locationsMap = new Map(); // Map<locationId, marker>
const placesMap = new Map(); // Map<placeId, marker>

let libMarker;
let libMaps;
let libCore;
let infoWindow;
let circleObj = { marker: null, center: null, radius: null };

async function initMap() {
  // load libraries
  libCore = await google.maps.importLibrary("core");
  libMaps = await google.maps.importLibrary("maps");
  libMarker = await google.maps.importLibrary("marker");

  infoWindow = new libMaps.InfoWindow();

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
    document.getElementById("address-error").innerHTML = "";

    if (!inputText.value.trim()) {
      console.log("Empty search value");
      return;
    }

    const request = new Request(location.href + "/location", {
      headers: new Headers({
        "Content-Type": "application/json",
      }),
      method: "POST",
      body: JSON.stringify({ address: inputText.value }),
    });

    fetch(request)
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          throw new Error(data.message);
        }
        inputText.value = data.formatted_address;
        togglePanel("location");
      })
      .catch((e) => {
        document.getElementById("address-error").innerHTML = e;
        inputText.value = "";
      });
  });

  document.getElementById("clear").addEventListener("click", () => {
    inputText.value = "";
  });

  document.getElementById("search").addEventListener("click", () => {
    let radius = document.getElementById("set-radius").value;
    radius = parseFloat(radius);
    if (isNaN(radius)) {
      radius = 1000;
    }

    const opennow = document.getElementById("set-opennow").value;
    const type = document.getElementById("set-type").value;

    const queryParams = new URLSearchParams({
      lng: circleObj.center.lng,
      lat: circleObj.center.lat,
      radius,
      opennow,
      type,
    });

    const request = new Request(location.href + "/places?" + queryParams, {
      headers: new Headers({
        "Content-Type": "application/json",
      }),
    });

    document.getElementById("search-error").innerHTML = "";

    fetch(request)
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          throw new Error(data.message);
        }
        listPlaces(data);
        togglePanel("places");
      })
      .catch((e) => {
        document.getElementById("search-error").innerHTML = e;
      })
      .finally(() => {});
  });

  document.getElementById("get-position").addEventListener("click", () => {
    getCurrentPosition();
  });

  document.getElementById("radius-plus").addEventListener("click", () => {
    const radius = getRadius() + 100;
    document.getElementById("set-radius").value = radius;
    circleObj.radius = radius;
    drawCircle();
  });

  document.getElementById("radius-minus").addEventListener("click", () => {
    const radius = getRadius() - 100;
    document.getElementById("set-radius").value = radius;
    circleObj.radius = radius;
    drawCircle();
  });

  document
    .getElementById("places-panel-toggle")
    .addEventListener("click", () => {
      document.getElementById("location-panel").style.display = "none";
      togglePanel("places");
      setSearchParams({ radius: circleObj.radius, opennow: null, type: null });
      drawCircle();
    });

  document
    .getElementById("location-panel-toggle")
    .addEventListener("click", () => {
      document.getElementById("places-panel").style.display = "none";
      togglePanel("location");
      clearCircle();
    });

  setupEventSource();
}

initMap();

function togglePanel(id) {
  const panel = document.getElementById(id + "-panel");
  panel.style.display = panel.style.display === "block" ? "none" : "block";
}

function getRadius() {
  const el = document.getElementById("set-radius");
  let radius = parseFloat(el.value);
  if (isNaN(radius)) {
    radius = 1000;
  }
  return radius;
}

function setupEventSource() {
  const eventSource = new EventSource(location.href + "/events");

  eventSource.onerror = (error) => {
    const el = document.getElementById("app-errors");
    el.innerHTML = "App error, refresh page";
    el.style.display = "block";
    console.error(error);
    eventSource.close();
  };

  eventSource.onopen = () => {
    const el = document.getElementById("app-errors");
    el.style.display = "none";
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

    const { locations, circle } = response.data;
    switch (response.event) {
      case "connected":
        setCurrentUser(response.data.userId);
        break;
      case "location_created":
      case "user_joined":
        createLocations(locations);
        if (circle) {
          circleObj.center = circle.center;
          circleObj.radius = circle.radius;
        }
        updateBounds();
        break;
      case "location_deleted":
      case "user_left":
        deleteLocations(locations);
        if (circle) {
          circleObj.center = circle.center;
          circleObj.radius = circle.radius;
        }
        updateBounds();
        break;
      case "places_found": {
        if (response.data.error) {
          throw new Error(response.data.message);
        }
        const { userId, search, places } = response.data;
        if (userId !== getCurrentUser()) {
          listPlaces(places);
          setSearchParams(search);
          circleObj.radius = search.radius;
          drawCircle();
        }
        break;
      }
      default:
        console.log("Unknown event: ", response.event);
    }
  };
}

function getCurrentPosition() {
  if (!navigator.geolocation) {
    console.error("Error: browser doesnt support geolocation");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      const request = new Request(location.href + "/current_position", {
        headers: new Headers({
          "Content-Type": "application/json",
        }),
        method: "POST",
        body: JSON.stringify({ position: pos }),
      });

      document.getElementById("address-error").innerHTML = "";
      fetch(request)
        .then((res) => {
          return res.json();
        })
        .then((data) => {
          if (data.error) {
            throw new Error(data.message);
          }
          togglePanel("location");
        })
        .catch((e) => {
          document.getElementById("address-error").innerHTML = e;
        });
    },
    () => {
      console.error("Geolocation permissions denied, using default location");
    },
  );
}

function createLocations(locations) {
  const currentUserId = getCurrentUser();
  for (const location of locations) {
    const isOwn = location.userId === currentUserId;

    const marker = createMarker(location, isOwn);
    mapElement.append(marker);
    locationsMap.set(location.id, marker);
  }
}

function createMarker(location, isOwn) {
  const { AdvancedMarkerElement } = libMarker;
  const { id, position, formatted_address } = location;

  const marker = new AdvancedMarkerElement({
    map: mapElement.innerMap,
    position,
    title: formatted_address,
  });

  const tag = document.createElement("div");
  tag.className = isOwn ? "you-tag" : "other-tag";
  tag.textContent = isOwn ? "You" : "Friend";
  marker.append(tag);

  marker.addListener("gmp-click", () => {
    mapElement.innerMap.panTo(position);
    updateInfoWindow(
      "Location",
      createLocationContent(formatted_address, id, isOwn),
      marker,
    );
  });

  return marker;
}

function deleteLocations(locations) {
  for (const location of locations) {
    if (!locationsMap.has(location.id)) {
      console.error("Marker not found", location.id);
    }

    const marker = locationsMap.get(location.id);
    marker.map = null;
    locationsMap.delete(locations.id);
  }
}

function deleteLocationRequest(e, id) {
  e.stopPropagation();
  infoWindow.close();

  const request = new Request(location.href + "/location/" + id, {
    method: "DELETE",
  });

  fetch(request).catch((e) => {
    console.error(e);
  });
}

function updateInfoWindow(title, content, anchor) {
  infoWindow.setContent(content);
  infoWindow.setHeaderContent(title);
  infoWindow.open({
    anchor,
  });
}

function updateBounds() {
  const bounds = new libCore.LatLngBounds();
  for (const [, marker] of locationsMap) {
    bounds.extend(marker.position);
  }
  mapElement.innerMap.fitBounds(bounds, 100);
}

function setCurrentUser(userId) {
  localStorage.setItem("currentUserId", userId);
}

function getCurrentUser() {
  return localStorage.getItem("currentUserId");
}

function listPlaces(data) {
  if (data.length === 0) {
    return;
  }

  for (const [, marker] of placesMap) {
    marker.remove();
  }

  const bounds = new libCore.LatLngBounds();
  data.forEach((place) => {
    const location = place.geometry.location;

    // extend map bounds
    bounds.extend(location);

    // create marker
    const marker = new libMarker.AdvancedMarkerElement({
      map: mapElement.innerMap,
      position: location,
      title: place.name,
    });
    marker.addListener("gmp-click", () => {
      mapElement.innerMap.panTo(location);
      updateInfoWindow(place.name, createPlaceContent(place), marker);
    });

    // add it to map
    placesMap.set(place.place_id, marker);
  });

  mapElement.innerMap.fitBounds(bounds, 100);
}

function createPlaceContent(place) {
  // Build the content of the InfoWindow safely using DOM elements.
  const content = document.createElement("div");
  content.style.padding = "0 10px 20px 0";

  const rating = document.createElement("div");
  rating.textContent = `⭐ ${place.rating ?? "N/A"}`;
  rating.style.paddingBottom = "10px";
  content.appendChild(rating);

  // address
  const address = document.createElement("div");
  address.textContent = place.vicinity;
  address.style.paddingBottom = "10px";
  content.appendChild(address);

  // link
  const link = document.createElement("a");
  link.href = "https://www.google.com/maps/place/?q=place_id:" + place.place_id;
  link.target = "_blank";
  link.textContent = "View Details on Google Maps";
  link.style.paddingBottom = "10px";
  content.appendChild(link);

  return content;
}

function createLocationContent(formatted_address, id, isOwn) {
  const content = document.createElement("div");

  // address
  const address = document.createElement("div");
  address.textContent = formatted_address;
  address.style.padding = "0 10px 15px 0";
  content.appendChild(address);

  if (isOwn) {
    // link
    const link = document.createElement("button");
    link.onclick = (e) => deleteLocationRequest(e, id);
    link.textContent = "Delete";
    link.style.margin = "0 0 15px 0";
    link.style.padding = "4px";
    content.appendChild(link);
  }

  return content;
}

function drawCircle() {
  const { radius, center } = circleObj;
  if (!radius || !center) {
    console.error("Circle radius or center is missing");
    return;
  }
  if (circleObj.marker) {
    circleObj.marker.setRadius(radius);
    circleObj.marker.setCenter(center);
    circleObj.marker.setMap(mapElement.innerMap);
    return;
  }
  circleObj.marker = new google.maps.Circle({
    strokeColor: "#ffdd00ff",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#ffdd00ff",
    fillOpacity: 0.35,
    map: mapElement.innerMap,
    center,
    radius,
    draggable: false,
    editable: false,
  });
}

function clearCircle() {
  if (circleObj.marker) {
    circleObj.marker.setMap(null);
  }
}

function setSearchParams({ radius, opennow, type }) {
  if (radius) {
    document.getElementById("set-radius").value = radius;
  }
  if (type) {
    document.getElementById("set-type").value = type;
  }
  if (opennow !== null) {
    document.getElementById("set-opennow").value = opennow;
  }
}
