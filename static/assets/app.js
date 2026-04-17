// const DEFAULT_ZOOM = 12;
const DEFAULT_POSITION = { lat: 52.4743213, lng: 13.4276562 };
const mapElement = document.querySelector("gmp-map");
const locationsMap = new Map(); // Map<locationId, { marker }>

let libMarker;
let libMaps;
let infoWindow;

const exampleData = [
  {
    business_status: "OPERATIONAL",
    geometry: {
      location: {
        lat: 52.520008,
        lng: 13.404954,
      },
      viewport: {
        northeast: {
          lat: 52.5213579802915,
          lng: 13.4063039802915,
        },
        southwest: {
          lat: 52.5186600197085,
          lng: 13.4036060197085,
        },
      },
    },
    icon: "https://maps.gstatic.com/mapfiles/place_api/icons/v1/png_71/cafe-71.png",
    icon_background_color: "#FF9E67",
    icon_mask_base_uri:
      "https://maps.gstatic.com/mapfiles/place_api/icons/v2/cafe_pinlet",
    name: "Sample Cafe Berlin",
    opening_hours: {
      open_now: true,
    },
    photos: [
      {
        height: 3024,
        width: 4032,
        photo_reference: "Aap_uEC...",
        html_attributions: [
          '<a href="https://maps.google.com/maps/contrib/123456789">User</a>',
        ],
      },
    ],
    place_id: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    plus_code: {
      compound_code: "CWC8+R9 Berlin, Germany",
      global_code: "9F4MCWC8+R9",
    },
    price_level: 2,
    rating: 4.4,
    reference: "ChIJN1t_tDeuEmsRUsoyG83frY4",
    scope: "GOOGLE",
    types: ["cafe", "food", "point_of_interest", "establishment"],
    user_ratings_total: 128,
    vicinity: "Alexanderplatz, Berlin",
  },
];

async function initMap() {
  // load libraries
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

    fetch(request)
      .then((res) => {
        return res.json();
      })
      .then((data) => {
        console.log(data);
        listResults(data);
      })
      .catch((e) => {
        console.error(e);
      });
  });

  document.querySelectorAll(".tab-link").forEach((el) => {
    el.addEventListener("click", (event) => {
      const id = event.target.getAttribute("data-target");
      openTab(id);
    });
  });

  openTab("tabPlaces");
  listResults(exampleData);
  //setupEventSource();
  //getCurrentPosition();
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

    const { locations } = response.data;
    switch (response.event) {
      case "connected":
        setCurrentUser(response.data.userId);
        break;
      case "location_created":
      case "user_joined":
        createMarker(locations);
        updateBounds();
        break;
      case "location_deleted":
      case "user_left":
        deleteMarker(locations);
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
      ? {}
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
  } else {
    mapElement.innerMap.fitBounds(bounds);
  }
  //mapElement.innerMap.setZoom(DEFAULT_ZOOM);
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
