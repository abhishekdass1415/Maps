// Base URL for backend API
// - Local dev: falls back to http://localhost:4000/api
// - Production (Vercel): set VITE_API_BASE_URL in environment variables to your Render backend URL + /api
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||   "https://map-backend-bc2ly6q8g-abhishek-dass-projects.vercel.app/"

export async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  return res.json();
}

export async function fetchPlaces(params: {
  category?: string;
  city?: string;
  state?: string;
}) {
  const query = new URLSearchParams(params as any).toString();
  const res = await fetch(`${API_BASE}/places?${query}`);
  return res.json();
}

export async function searchPlaces(query: string) {
  const res = await fetch(
    `${API_BASE}/places?query=${encodeURIComponent(query)}`
  );
  return res.json();
}

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusKm: number,
  category?: string
) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius: radiusKm.toString()
  });

  if (category) params.append("category", category);

  const res = await fetch(
    `${API_BASE}/places/nearby?${params.toString()}`
  );
  return res.json();
}

export async function fetchCities() {
  const res = await fetch(`${API_BASE}/places/cities`);
  return res.json();
}

export async function fetchCityCoordinates(cityName: string) {
  const res = await fetch(
    `${API_BASE}/places/city/${encodeURIComponent(cityName)}/coordinates`
  );
  if (!res.ok) {
    throw new Error("City not found");
  }
  return res.json();
}

export async function getDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
) {
  const res = await fetch(
    `${API_BASE}/directions?origin=${originLat},${originLng}&destination=${destLat},${destLng}`
  );
  if (!res.ok) {
    throw new Error("Failed to get directions");
  }
  return res.json();
}

export async function fetchPlaceDetails(placeId: string) {
  const res = await fetch(
    `${API_BASE}/places/${encodeURIComponent(placeId)}/details`
  );
  if (!res.ok) {
    throw new Error("Failed to fetch place details");
  }
  return res.json();
}
