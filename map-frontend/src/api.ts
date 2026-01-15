const API_BASE = "http://localhost:4000/api";

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
      `http://localhost:4000/api/places?query=${encodeURIComponent(query)}`
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
      `http://localhost:4000/api/places/nearby?${params.toString()}`
    );
    return res.json();
  }
  export async function fetchCities() {
    const res = await fetch("http://localhost:4000/api/places/cities");
    return res.json();
  }

  export async function fetchCityCoordinates(cityName: string) {
    const res = await fetch(
      `http://localhost:4000/api/places/city/${encodeURIComponent(cityName)}/coordinates`
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
      `http://localhost:4000/api/directions?origin=${originLat},${originLng}&destination=${destLat},${destLng}`
    );
    if (!res.ok) {
      throw new Error("Failed to get directions");
    }
    return res.json();
  }
  