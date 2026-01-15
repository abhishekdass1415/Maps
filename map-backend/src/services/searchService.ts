import { prisma } from "../db";
import axios from "axios";
import { cacheExternalPlaces } from "../providers/cacheExternalPlaces";

// Category keyword mapping (order matters - more specific first)
const CATEGORY_KEYWORDS: Array<[string, string]> = [
  ["petrol pump", "petrol-pump"],
  ["petrolpump", "petrol-pump"],
  ["gas station", "petrol-pump"],
  ["ev charger", "ev-charger"],
  ["ev charging", "ev-charger"],
  ["public toilet", "public-toilet"],
  ["police station", "police-station"],
  ["fire station", "fire-station"],
  ["hospital", "hospital"],
  ["toilet", "public-toilet"],
  ["restaurant", "restaurant"],
  ["restaurants", "restaurant"],
  ["cafe", "cafe"],
  ["atm", "atm"],
  ["atms", "atm"],
  ["parking", "parking"],
  ["police", "police-station"]
];

// Common Indian cities for detection
const COMMON_CITIES = [
  "mumbai", "delhi", "bangalore", "hyderabad", "ahmedabad", "chennai",
  "kolkata", "surat", "pune", "jaipur", "lucknow", "kanpur", "nagpur",
  "indore", "thane", "bhopal", "visakhapatnam", "patna", "vadodara",
  "ghaziabad", "ludhiana", "agra", "nashik", "faridabad", "meerut",
  "rajkot", "varanasi", "srinagar", "amritsar", "goa", "panaji"
];

type SearchIntent = {
  query: string;
  category?: string;
  city?: string;
  hasNearMe: boolean;
  lat?: number;
  lng?: number;
};

type PlaceResult = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
};

/**
 * Normalize query: lowercase, trim, remove extra spaces
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Detect search intent from query
 */
function detectIntent(
  query: string,
  lat?: number,
  lng?: number
): SearchIntent {
  const normalized = normalizeQuery(query);
  const intent: SearchIntent = {
    query: normalized,
    hasNearMe: false
  };

  // Check for "near me"
  if (normalized.includes("near me") || normalized.includes("nearme")) {
    intent.hasNearMe = true;
    if (lat && lng) {
      intent.lat = lat;
      intent.lng = lng;
    }
    // Remove "near me" from query for further processing
    intent.query = normalized.replace(/near\s*me/gi, "").trim();
  }

  // Detect category keywords (check more specific first)
  for (const [keyword, slug] of CATEGORY_KEYWORDS) {
    if (normalized.includes(keyword)) {
      intent.category = slug;
      // Remove category keyword from query
      intent.query = intent.query.replace(new RegExp(keyword, "gi"), "").trim();
      break;
    }
  }

  // Detect city names
  for (const city of COMMON_CITIES) {
    if (normalized.includes(city)) {
      intent.city = city;
      // Remove city from query
      intent.query = intent.query.replace(new RegExp(city, "gi"), "").trim();
      break;
    }
  }

  // Clean up remaining query
  intent.query = intent.query.replace(/\s+/g, " ").trim();

  return intent;
}

/**
 * Search places in database
 */
async function searchInDB(intent: SearchIntent): Promise<PlaceResult[]> {
  const where: any = {
    isActive: true
  };

  // Apply category filter
  if (intent.category) {
    where.categories = {
      some: { slug: intent.category }
    };
  }

  // Apply city filter
  if (intent.city) {
    where.city = { contains: intent.city, mode: "insensitive" };
  }

  // Apply name search if query remains
  if (intent.query) {
    where.name = { contains: intent.query, mode: "insensitive" };
  }

  // Apply location filter if "near me" with coordinates
  if (intent.hasNearMe && intent.lat && intent.lng) {
    const radiusKm = 10; // Default radius for "near me"
    const delta = radiusKm / 111;
    where.latitude = { gte: intent.lat - delta, lte: intent.lat + delta };
    where.longitude = { gte: intent.lng - delta, lte: intent.lng + delta };
  }

  const places = await prisma.place.findMany({
    where,
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      city: true,
      state: true
    },
    take: 500
  });

  return places;
}

/**
 * Search places using Google Places Text Search API
 */
async function searchWithGoogleAPI(
  intent: SearchIntent
): Promise<{ places: PlaceResult[]; externalIds: string[] }> {
  try {
    // Build Google Places query
    let googleQuery = intent.query || "";

    // Add category to query if available
    if (intent.category) {
      const categoryName = intent.category.replace("-", " ");
      googleQuery = `${categoryName} ${googleQuery}`.trim();
    }

    // Add city to query if available
    if (intent.city) {
      googleQuery = `${googleQuery} in ${intent.city}`.trim();
    }

    // Add location if "near me"
    const params: any = {
      query: googleQuery || "places",
      key: process.env.GOOGLE_MAPS_API_KEY
    };

    if (intent.hasNearMe && intent.lat && intent.lng) {
      params.location = `${intent.lat},${intent.lng}`;
      params.radius = 10000; // 10km radius
    }

    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      { params }
    );

    const results = res.data.results ?? [];

    // Transform to our format and collect externalIds
    const places: PlaceResult[] = [];
    const externalIds: string[] = [];

    for (const p of results) {
      places.push({
        id: p.place_id, // Use place_id as temporary ID
        name: p.name,
        latitude: p.geometry.location.lat,
        longitude: p.geometry.location.lng,
        city: extractCityFromAddress(p.formatted_address),
        state: null
      });
      externalIds.push(p.place_id);
    }

    // Save to DB asynchronously (if category detected)
    if (places.length > 0 && intent.category) {
      const placesToCache = results.map((p: any) => ({
        externalId: p.place_id,
        name: p.name,
        latitude: p.geometry.location.lat,
        longitude: p.geometry.location.lng,
        address: p.formatted_address ?? null,
        source: "google"
      }));

      cacheExternalPlaces(placesToCache, intent.category).catch((err) => {
        console.error("Failed to cache external places:", err);
      });
    }

    return { places, externalIds };
  } catch (error) {
    console.error("Google Places API error:", error);
    return { places: [], externalIds: [] };
  }
}

/**
 * Extract city name from Google Places formatted address
 */
function extractCityFromAddress(address?: string): string | null {
  if (!address) return null;

  // Common pattern: "Street, City, State, Country"
  const parts = address.split(",").map((p) => p.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 3] || parts[parts.length - 2] || null;
  }
  return null;
}

/**
 * Deduplicate places by externalId or proximity
 */
async function deduplicatePlaces(
  dbPlaces: PlaceResult[],
  apiPlaces: PlaceResult[],
  apiExternalIds: string[]
): Promise<PlaceResult[]> {
  const result: PlaceResult[] = [...dbPlaces];
  
  // Batch check which API places already exist in DB by externalId
  const existingPlaces = await prisma.place.findMany({
    where: {
      externalId: { in: apiExternalIds }
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      externalId: true
    }
  });

  const existingExternalIds = new Set(existingPlaces.map((p) => p.externalId));
  const dbPlaceByExternalId = new Map(
    existingPlaces.map((p) => [p.externalId!, p])
  );

  // Check each API place for duplicates
  for (let i = 0; i < apiPlaces.length; i++) {
    const apiPlace = apiPlaces[i];
    const externalId = apiExternalIds[i];

    // If exists in DB, use DB version (has real UUID id)
    if (existingExternalIds.has(externalId)) {
      const dbPlace = dbPlaceByExternalId.get(externalId);
      if (dbPlace && !result.some((p) => p.id === dbPlace.id)) {
        result.push({
          id: dbPlace.id,
          name: dbPlace.name,
          latitude: dbPlace.latitude,
          longitude: dbPlace.longitude,
          city: dbPlace.city,
          state: dbPlace.state
        });
      }
      continue;
    }

    // Check by proximity to DB places
    const isDuplicate = dbPlaces.some((dbPlace) => {
      const latDiff = Math.abs(dbPlace.latitude - apiPlace.latitude);
      const lngDiff = Math.abs(dbPlace.longitude - apiPlace.longitude);
      // Consider duplicate if within ~50 meters (approximately 0.0005 degrees)
      return latDiff < 0.0005 && lngDiff < 0.0005;
    });

    if (!isDuplicate) {
      result.push(apiPlace);
    }
  }

  return result;
}

/**
 * Main smart search function
 */
export async function smartSearch(params: {
  query: string;
  category?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
}): Promise<PlaceResult[]> {
  const { query, category, city, state, lat, lng } = params;

  // If no query, fall back to existing filter logic (handled in route)
  if (!query) {
    return [];
  }

  // Detect intent from query
  const intent = detectIntent(query, lat, lng);

  // Override with explicit params if provided
  if (category) intent.category = category;
  if (city) intent.city = city;

  // Search in database first
  const dbResults = await searchInDB(intent);

  // If we have enough results, return them
  const MIN_RESULTS_THRESHOLD = 10;
  if (dbResults.length >= MIN_RESULTS_THRESHOLD) {
    return dbResults;
  }

  // Otherwise, try Google API fallback
  const apiResponse = await searchWithGoogleAPI(intent);
  const apiResults = apiResponse.places;
  const apiExternalIds = apiResponse.externalIds;

  // Merge and deduplicate results
  const merged = await deduplicatePlaces(dbResults, apiResults, apiExternalIds);

  // Return merged results (DB + API, deduplicated)
  return merged;
}
