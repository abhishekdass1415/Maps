import { getPlacesFromDB } from "../providers/dbPlaceProvider";
import { getPlacesFromExternalAPI } from "../providers/externalPlaceProvider";
import { cacheExternalPlaces } from "../providers/cacheExternalPlaces";

export async function getPlacesWithFallback(params: {
  lat: number;
  lng: number;
  radiusKm: number;
  category: string;
}) {
  const dbResults = await getPlacesFromDB(params);

  if (dbResults.length > 0) {
    return { source: "database", places: dbResults };
  }

  const apiResults = await getPlacesFromExternalAPI(params);

  // 🔐 cache asynchronously (non-blocking UX)
  cacheExternalPlaces(apiResults, params.category).catch(console.error);

  return { source: "external", places: apiResults };
}
