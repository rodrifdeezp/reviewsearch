const CACHE_TTL_MS = 5 * 60 * 1000;
const RATE_LIMIT_MS = 1100;
const MAX_RESULTS = 50;

const cache = new Map();
let lastRequestAt = 0;

const USER_AGENT =
  process.env.OSM_USER_AGENT || "OpenEatsFinder/0.1 (Netlify Function)";
const NOMINATIM_EMAIL = process.env.NOMINATIM_EMAIL;
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];
const OVERPASS_TIMEOUT_MS = 12000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, RATE_LIMIT_MS - (now - lastRequestAt));
  if (wait > 0) {
    await sleep(wait);
  }
  lastRequestAt = Date.now();
}

function formatReverseAddress(address) {
  if (!address) return null;
  const road = address.road || address.pedestrian || address.footway;
  const house = address.house_number;
  const neighborhood = address.neighbourhood || address.suburb;
  const city = address.city || address.town || address.village || address.municipality;
  const parts = [];
  if (road) {
    parts.push(house ? `${road} ${house}` : road);
  }
  if (neighborhood) parts.push(neighborhood);
  if (city) parts.push(city);
  return parts.filter(Boolean).join(", ") || null;
}

async function reverseGeocode(lat, lon) {
  await throttle();
  const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
  reverseUrl.searchParams.set("format", "jsonv2");
  reverseUrl.searchParams.set("lat", String(lat));
  reverseUrl.searchParams.set("lon", String(lon));
  reverseUrl.searchParams.set("zoom", "18");
  reverseUrl.searchParams.set("addressdetails", "1");
  if (NOMINATIM_EMAIL) {
    reverseUrl.searchParams.set("email", NOMINATIM_EMAIL);
  }

  const response = await fetch(reverseUrl.toString(), {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const formatted = formatReverseAddress(data?.address);
  return formatted || data?.display_name || null;
}

async function fetchOverpass(query) {
  let lastError = "Overpass request failed.";

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        body: query,
        signal: controller.signal,
      });
    } catch (error) {
      lastError = error.name === "AbortError"
        ? "Overpass request timed out."
        : "Overpass request failed.";
      clearTimeout(timeoutId);
      await sleep(400);
      continue;
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) {
      return response.json();
    }

    lastError = `Overpass error ${response.status}.`;
    await sleep(400);
  }

  throw new Error(lastError);
}

async function fetchOverpassWithFallback({ lat, lon, radius }) {
  const steps = [radius, Math.max(Math.floor(radius * 0.7), 600), 600];
  let lastError = "Overpass request failed.";

  for (const stepRadius of steps) {
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"~"restaurant|fast_food"](around:${stepRadius},${lat},${lon});
        way["amenity"~"restaurant|fast_food"](around:${stepRadius},${lat},${lon});
        relation["amenity"~"restaurant|fast_food"](around:${stepRadius},${lat},${lon});

        node["shop"~"fast_food|burger"](around:${stepRadius},${lat},${lon});
        way["shop"~"fast_food|burger"](around:${stepRadius},${lat},${lon});
        relation["shop"~"fast_food|burger"](around:${stepRadius},${lat},${lon});
      );
      out tags center;
    `;

    try {
      const data = await fetchOverpass(overpassQuery);
      return { data, usedRadius: stepRadius };
    } catch (error) {
      lastError = error.message || "Overpass request failed.";
    }
  }

  const err = new Error(lastError);
  err.code = "OVERPASS_UNAVAILABLE";
  throw err;
}

function buildCacheKey({ location, latitude, longitude, radius, filters }) {
  return JSON.stringify({
    location: location ? location.toLowerCase() : "",
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    radius,
    filters: {
      cuisine: filters.cuisine?.toLowerCase() || "",
      hasWebsite: !!filters.hasWebsite,
      hasOpeningHours: !!filters.hasOpeningHours,
      burgerOnly: !!filters.burgerOnly,
    },
  });
}

function formatCuisine(cuisine) {
  if (!cuisine) return "";
  return cuisine
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ")
    .toLowerCase();
}

function formatAddress(tags) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.join(", ");
}

function computeScore({ website, openingHours, phone, cuisine }) {
  return [website, openingHours, phone, cuisine].filter(Boolean).length;
}

function normalizeElement(element) {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const website = tags.website || tags["contact:website"] || tags.url;
  const phone = tags.phone || tags["contact:phone"];
  const openingHours = tags.opening_hours;
  const name = (tags.name || "").trim().toLowerCase();
  const cuisine = formatCuisine(tags.cuisine);
  const amenity = tags.amenity === "fast_food" ? "fast_food" : "restaurant";
  const score = computeScore({ website, openingHours, phone, cuisine });
  const isBurger = isBurgerPlace({ cuisine, nameLower: name });
  const type = element.type;
  const id = `${type}-${element.id}`;
  const osmUrl = `https://www.openstreetmap.org/${type}/${element.id}`;
  const googleMapsUrl = lat && lon
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
    : "";

  const tagsList = [];
  if (website) tagsList.push("website");
  if (phone) tagsList.push("phone");
  if (openingHours) tagsList.push("opening_hours");

  return {
    id,
    name,
    amenity,
    cuisine,
    isBurger,
    address: formatAddress(tags),
    completenessScore: score,
    score,
    tags: tagsList,
    website,
    phone,
    openingHours,
    lat,
    lon,
    osmUrl,
    googleMapsUrl,
  };
}

function isBurgerPlace({ cuisine, nameLower }) {
  if (cuisine && cuisine.includes("burger")) return true;
  if (nameLower && nameLower.includes("burger")) return true;
  return false;
}

function normalizeCuisineFilter(input) {
  const value = (input || "").trim().toLowerCase();
  if (!value) return "";
  if (value === "indio") return "indian";
  if (value === "mexicano") return "mexican";
  if (value === "mexicana") return "mexican";
  if (value === "mexico") return "mexican";
  if (value === "italiano") return "italian";
  if (value === "italiana") return "italian";
  if (value === "japones") return "japanese";
  if (value === "china") return "chinese";
  if (value === "chino") return "chinese";
  if (value === "koreano") return "korean";
  if (value === "coreano") return "korean";
  if (value === "tailandes") return "thai";
  if (value === "griego") return "greek";
  if (value === "turco") return "turkish";
  if (value === "argentino") return "argentinian";
  if (value === "peruano") return "peruvian";
  if (value === "venezolano") return "venezuelan";
  if (value === "colombiano") return "colombian";
  if (value === "brasileno") return "brazilian";
  if (value === "espanol") return "spanish";
  if (value === "frances") return "french";
  if (value === "aleman") return "german";
  if (value === "arabe") return "arab";
  if (value === "marroqui") return "moroccan";
  if (value === "libanes") return "lebanese";
  if (value === "egipcio") return "egyptian";
  if (value === "sushi") return "sushi";
  if (value === "pizza") return "pizza";
  if (value === "burger") return "burger";
  if (value === "hamburguesa") return "burger";
  if (value === "hamburguesas") return "burger";
  return value;
}

function matchesCuisine(restaurant, cuisine) {
  if (!cuisine) return true;
  if (!restaurant.cuisine) return false;
  return restaurant.cuisine.includes(cuisine);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method not allowed" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid JSON" }) };
  }

  const location = (payload.location || "").trim();
  const radius = Number(payload.radius) || 1500;
  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);
  const filters = payload.filters || {};
  const debug = Boolean(payload.debug);

  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!hasCoords && (!location || location.length < 3)) {
    return { statusCode: 400, body: JSON.stringify({ message: "Location is required." }) };
  }

  if (hasCoords) {
    const validLat = latitude >= -90 && latitude <= 90;
    const validLon = longitude >= -180 && longitude <= 180;
    if (!validLat || !validLon) {
      return { statusCode: 400, body: JSON.stringify({ message: "Invalid coordinates." }) };
    }
  }

  const safeRadius = Math.max(radius, 300);

  const shouldCache = !hasCoords;
  const cacheKey = buildCacheKey({
    location,
    latitude,
    longitude,
    radius: safeRadius,
    filters,
  });
  if (shouldCache) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ...cached.data,
          meta: { ...cached.data.meta, cache: "hit" },
        }),
      };
    }
  }

  try {
    let displayName = "Ubicación actual";
    let lat = latitude;
    let lon = longitude;

    if (!hasCoords) {
      await throttle();
      const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
      nominatimUrl.searchParams.set("format", "jsonv2");
      nominatimUrl.searchParams.set("q", location);
      nominatimUrl.searchParams.set("limit", "1");
      nominatimUrl.searchParams.set("addressdetails", "1");
      if (NOMINATIM_EMAIL) {
        nominatimUrl.searchParams.set("email", NOMINATIM_EMAIL);
      }

      const nominatimResponse = await fetch(nominatimUrl.toString(), {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept-Language": "en",
        },
      });

      if (!nominatimResponse.ok) {
        throw new Error("Failed to geocode location.");
      }

      const nominatimData = await nominatimResponse.json();
      if (!Array.isArray(nominatimData) || nominatimData.length === 0) {
        return { statusCode: 404, body: JSON.stringify({ message: "Location not found." }) };
      }

      const best = nominatimData[0];
      displayName = best.display_name;
      lat = Number(best.lat);
      lon = Number(best.lon);
    } else {
      const resolvedName = await reverseGeocode(lat, lon);
      if (resolvedName) {
        displayName = resolvedName;
      }
    }

    const cuisineFilter = normalizeCuisineFilter(filters.cuisine);

    await throttle();
    const { data: overpassData, usedRadius } = await fetchOverpassWithFallback({
      lat,
      lon,
      radius: safeRadius,
    });
    const elements = Array.isArray(overpassData.elements)
      ? overpassData.elements
      : [];

    const normalized = elements
      .map(normalizeElement)
      .filter((item) => item.lat && item.lon);

    const filtered = debug
      ? normalized
      : normalized.filter((item) => {
          if (filters.hasWebsite && !item.website) return false;
          if (filters.hasOpeningHours && !item.openingHours) return false;
          if (!matchesCuisine(item, cuisineFilter)) return false;
          if (filters.burgerOnly && !item.isBurger) return false;
          return true;
        });

    const sorted = filtered.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.name || "").localeCompare(b.name || "");
    });

    const results = sorted.slice(0, MAX_RESULTS).map((item) => ({
      id: item.id,
      name: item.name,
      amenity: item.amenity,
      cuisine: item.cuisine,
      address: item.address,
      isBurger: item.isBurger,
      tags: item.tags,
      osmUrl: item.osmUrl,
      googleMapsUrl: item.googleMapsUrl,
    }));

    const payloadResponse = {
      meta: {
        displayName,
        lat,
        lon,
        radius: usedRadius ?? safeRadius,
        total: results.length,
        cache: shouldCache ? "miss" : "bypass",
        debugNames: debug
          ? sorted.slice(0, MAX_RESULTS).map((item) => item.name).filter(Boolean)
          : undefined,
      },
      results,
    };

    if (shouldCache) {
      cache.set(cacheKey, { timestamp: Date.now(), data: payloadResponse });
    }

    return { statusCode: 200, body: JSON.stringify(payloadResponse) };
  } catch (error) {
    console.error(error);
    if (error.code === "OVERPASS_UNAVAILABLE") {
      return {
        statusCode: 503,
        body: JSON.stringify({
          message: "Overpass está saturado. Intenta de nuevo en unos minutos.",
        }),
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message || "Unexpected error",
      }),
    };
  }
};
