export function getPosition(pos) {
  const lat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
  const lng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
  return { lat, lng };
}

export function parsePosition(position) {
  return {
    lat: parseFloat(position.lat.toFixed(3)),
    lng: parseFloat(position.lng.toFixed(3)),
  };
}
