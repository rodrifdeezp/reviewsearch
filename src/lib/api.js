export async function fetchRestaurants({ location, latitude, longitude, radius, filters }) {
  const response = await fetch("/api/search-restaurants", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      location,
      latitude,
      longitude,
      radius,
      filters,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "Failed to fetch restaurants.");
  }

  return response.json();
}
