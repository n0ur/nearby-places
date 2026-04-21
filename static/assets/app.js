const DEFAULT_ZOOM = 14;
const DEFAULT_POSITION = { lat: 52.4743213, lng: 13.4276562 };
const mapElement = document.querySelector("gmp-map");

const locationsMap = new Map(); // Map<locationId, { marker }>
const placesMarkers = [];

let libMarker;
let libMaps;
let libCore;
let infoWindow;
let circle;

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
    const request = new Request(location.href + "/places", {
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
        listResults(data);
        drawPlacesMarkers(data);
      })
      .catch((e) => {
        document.getElementById("search-error").innerHTML = e;
      })
      .finally(() => {
        document.getElementById("search-loading").style.display = "none";
      });
  });

  document.querySelectorAll(".tab-link").forEach((el) => {
    el.addEventListener("click", (event) => {
      const id = event.target.getAttribute("data-target");
      openTab(id);
    });
  });

  openTab("tabPlaces");
  setupEventSource();
  getCurrentPosition();
}

initMap();

/* eslint-disable no-unused-vars */
function deleteLink(id) {
  infoWindow.close();

  const request = new Request(location.href + "/location/" + id, {
    method: "DELETE",
  });

  fetch(request).catch((e) => {
    console.error(e);
  });
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
        createMarker(locations);
        circle && drawCircle(circle);
        updateBounds();
        break;
      case "location_deleted":
      case "user_left":
        deleteMarker(locations);
        circle && drawCircle(circle);
        updateBounds();
        break;
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

function createMarker(locations) {
  const currentUserId = getCurrentUser();
  const { AdvancedMarkerElement, PinElement } = libMarker;

  for (const location of locations) {
    const { userId, id, position, formatted_address } = location;
    const isOwn = userId === currentUserId;

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

    const marker = new AdvancedMarkerElement({
      position,
      title: formatted_address,

      gmpDraggable: true,
      gmpClickable: true,
    });
    marker.append(pin);

    const clickListener = () => {
      infoWindow.close();
      // js + css + html in one line => fixme
      const link = `<strong style="color:blue;text-transform:underline" onclick="deleteLink('${id}')">Delete</strong>`;
      // show delete button when it's the user's location
      const contentString = marker.title + (isOwn ? `<p>${link}</p>` : "");
      infoWindow.setContent(contentString);
      infoWindow.open(marker.map, marker);
    };
    marker.addEventListener("gmp-click", clickListener);

    mapElement.append(marker);
    locationsMap.set(id, { marker, formatted_address, clickListener });
  }
}

function deleteMarker(locations) {
  for (const location of locations) {
    const { id } = location;
    if (!locationsMap.has(id)) {
      console.error("Marker not found", id);
    }
    const { marker, clickListener } = locationsMap.get(id);
    marker.map = null;
    marker.removeEventListener(clickListener);
    locationsMap.delete(id);
  }
}

// TODO: needs improvement
function updateBounds() {
  const bounds = new google.maps.LatLngBounds();
  for (const [, { marker }] of locationsMap) {
    bounds.extend(marker.position);
  }
  // When there's only one marker, fitBounds() zooms to the maximum zoom level
  if (locationsMap.size === 1) {
    const { marker } = [...locationsMap.values()][0];
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
}

function listResults(data) {
  const container = document.getElementById("search-results");

  data.forEach((place) => {
    const item = document.createElement("div");
    item.className = "place-item";

    item.innerHTML = `
      <h3>${place.name}</h3>
      <p>${place.vicinity}</p>
      <p>⭐ ${place.rating ?? "N/A"}</p>
    `;

    container.appendChild(item);
  });
}

function drawCircle({ radius, center }) {
  if (circle) {
    circle.setRadius(radius);
    circle.setCenter(center);
    return;
  }
  circle = new google.maps.Circle({
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

function drawPlacesMarkers(data) {
  if (data.length === 0) {
    return;
  }

  for (const marker of placesMarkers) {
    marker.remove();
  }

  const bounds = new libCore.LatLngBounds();
  data.forEach((place) => {
    const location = place.geometry.location;
    bounds.extend(location);
    const marker = new libMarker.AdvancedMarkerElement({
      map: mapElement.innerMap,
      position: location,
      title: place.name,
    });

    placesMarkers.push(marker);

    // Build the content of the InfoWindow safely using DOM elements.
    const content = document.createElement("div");

    // address
    const address = document.createElement("div");
    address.textContent = place.vicinity || "";

    // link
    const link = document.createElement("a");
    link.href =
      "https://www.google.com/maps/place/?q=place_id:" + place.place_id;
    link.target = "_blank";
    link.textContent = "View Details on Google Maps";

    // pic
    //const img = document.createElement('img');
    //img.src = place.photoUrl
    //img.alt = place.name;

    // content.appendChild(img);
    content.appendChild(link);

    marker.addListener("gmp-click", () => {
      mapElement.innerMap.panTo(location);
      updateInfoWindow(place.name, content, marker);
    });
  });

  mapElement.innerMap.fitBounds(bounds, 100);
}

function updateInfoWindow(title, content, anchor) {
  infoWindow.setContent(content);
  infoWindow.setHeaderContent(title);
  infoWindow.open({
    anchor,
  });
}
