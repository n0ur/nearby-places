const DEFAULT_ZOOM = 14;
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

    document.getElementById("search-results").innerHTML = "";
    document.getElementById("search-error").innerHTML = "";
    document.getElementById("search-loading").style.display = "block";

    fetch(request)
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        if (data.error) {
          throw new Error(data.message);
        }
        listPlaces(data);
      })
      .catch((e) => {
        document.getElementById("search-error").innerHTML = e;
      })
      .finally(() => {
        document.getElementById("search-loading").style.display = "none";
      });
  });

  document.getElementById("get-position").addEventListener("click", () => {
    getCurrentPosition();
  });

  document.querySelectorAll(".tab-link").forEach((el) => {
    el.addEventListener("click", (event) => {
      const id = event.target.getAttribute("data-target");
      openTab(id);
    });
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

  openTab("tabLocations");
  setupEventSource();
}

initMap();

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

      fetch(request).catch((e) => {
        console.error(e);
      });
    },
    () => {
      console.error("Geolocation permissions denied, using default location");
    },
  );
}

function createLocations(locations) {
  const ownLocations = document.getElementById("locations-own");
  const otherLocations = document.getElementById("locations-others");

  const currentUserId = getCurrentUser();
  for (const location of locations) {
    const isOwn = location.userId === currentUserId;

    const marker = createMarker(location, isOwn);
    mapElement.append(marker);
    // create a marker, add it to the map, make it clickable
    // create a list item, make the list item clickable, append it
    // each list item has an id, when delete is clicked, its selected and deleted

    locationsMap.set(location.id, marker);

    const item = createLocationItem(
      location,
      (locationId) => {
        locationsMap.get(locationId)?.click();
      },
      isOwn,
    );

    if (isOwn) {
      ownLocations.appendChild(item);
    } else {
      otherLocations.appendChild(item);
    }
  }
}

function createLocationItem(location, onClick, isOwn) {
  const item = document.createElement("div");
  item.className = "place-item";
  item.id = "place-" + location.id;
  item.innerHTML = location.formatted_address;

  if (isOwn) {
    const del = document.createElement("strong");
    del.innerHTML = " - Delete";
    // delete a location
    del.addEventListener("click", (e) => {
      deleteLocationRequest(e, location.id);
    });
    item.appendChild(del);
  }

  item.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick(location.id);
  });
  return item;
}

function createMarker(location, isOwn) {
  const { AdvancedMarkerElement, PinElement } = libMarker;
  const { position, formatted_address } = location;

  const marker = new AdvancedMarkerElement({
    position,
    title: formatted_address,

    gmpDraggable: true,
    gmpClickable: true,
  });

  const styles = isOwn
    ? {
        background: "#5c98e7",
        borderColor: "#137333",
      }
    : {
        background: "#FBBC04",
        borderColor: "#137333",
      };
  const pin = new PinElement(styles);
  marker.append(pin);

  const clickListener = () => {
    infoWindow.close();
    infoWindow.setContent(marker.title);
    infoWindow.open(marker.map, marker);
  };
  marker.addEventListener("gmp-click", clickListener);

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

    document.getElementById("place-" + location.id).remove();
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

// TODO: needs improvement
function updateBounds() {
  const bounds = new google.maps.LatLngBounds();
  for (const [, marker] of locationsMap) {
    bounds.extend(marker.position);
  }
  // When there's only one marker, fitBounds() zooms to the maximum zoom level
  if (locationsMap.size === 1) {
    const marker = [...locationsMap.values()][0];
    mapElement.innerMap.setCenter(marker.position);
    mapElement.innerMap.setZoom(DEFAULT_ZOOM);
  } else {
    mapElement.innerMap.fitBounds(bounds, 300);
  }
}

function setCurrentUser(userId) {
  localStorage.setItem("currentUserId", userId);
}

function getCurrentUser() {
  return localStorage.getItem("currentUserId");
}

function openTab(id) {
  const tabs = document.querySelectorAll(".tab-content");
  tabs.forEach((t) => (t.style.display = "none"));

  const links = document.querySelectorAll(".tab-link");
  links.forEach((t) => {
    t.className = t.className.replace(" active", "");
    if (t.getAttribute("data-target") === id) {
      t.className += " active";
    }
  });
  document.getElementById(id).style.display = "block";

  if (id === "tabPlaces") {
    drawCircle();
    setSearchParams({ radius: circleObj.radius, opennow: null, type: null });
  } else {
    clearCircle();
  }
}

function listPlaces(data) {
  if (data.length === 0) {
    return;
  }

  // clear list + markers
  const container = document.getElementById("search-results");
  container.innerHTML = "";

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
      updateInfoWindow(place.name, createWindowContent(place), marker);
    });

    // add it to map
    placesMap.set(place.place_id, marker);

    // add an item to the list
    container.appendChild(
      createPlaceItem(place, (placeId) => {
        placesMap.get(placeId)?.click();
      }),
    );
  });

  mapElement.innerMap.fitBounds(bounds, 100);
}

function createPlaceItem(place, onClick) {
  const item = document.createElement("div");
  item.className = "place-item";

  item.innerHTML = `
    <h3>${place.name}</h3>
    <p>${place.vicinity}</p>
    <p>⭐ ${place.rating ?? "N/A"}</p>
  `;

  item.addEventListener("click", (e) => {
    onClick(place.place_id);
    e.stopPropagation();
  });
  return item;
}

function createWindowContent(place) {
  // Build the content of the InfoWindow safely using DOM elements.
  const content = document.createElement("div");

  // address
  const address = document.createElement("div");
  address.textContent = place.vicinity || "";

  // link
  const link = document.createElement("a");
  link.href = "https://www.google.com/maps/place/?q=place_id:" + place.place_id;
  link.target = "_blank";
  link.textContent = "View Details on Google Maps";
  content.appendChild(link);

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
