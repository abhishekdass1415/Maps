import axios from "axios";

type ExternalPlace = {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  vicinity?: string;
};

export async function getPlacesFromExternalAPI({
  lat,
  lng,
  radiusKm,
  category
}: {
  lat: number;
  lng: number;
  radiusKm: number;
  category: string;
}) {
  const radiusMeters = Math.min(radiusKm * 1000, 50000);

  const res = await axios.get(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    {
      params: {
        location: `${lat},${lng}`,
        radius: radiusMeters,
        type: category.replace("-", "_"), // google expects snake_case
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    }
  );

  const results: ExternalPlace[] = res.data.results ?? [];

  return results.map((p) => ({
    externalId: p.place_id,
    name: p.name,
    latitude: p.geometry.location.lat,
    longitude: p.geometry.location.lng,
    address: p.vicinity ?? null,
    source: "google"
  }));
}
