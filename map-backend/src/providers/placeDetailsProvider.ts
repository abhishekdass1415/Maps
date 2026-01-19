import axios from "axios";

type GooglePlaceDetailsResponse = {
  result: {
    name?: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    photos?: Array<{
      photo_reference: string;
      width: number;
      height: number;
    }>;
    opening_hours?: {
      open_now?: boolean;
      weekday_text?: string[];
    };
  };
  status: string;
};

export type PlaceDetailsFromAPI = {
  phone: string | null;
  website: string | null;
  photoRefs: string[];
  openingStatus: "open" | "closed" | "unknown";
};

/**
 * Fetch place details from Google Places Details API
 * Returns null if API call fails or place not found
 */
export async function getPlaceDetailsFromGoogleAPI(
  externalId: string
): Promise<PlaceDetailsFromAPI | null> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn("GOOGLE_MAPS_API_KEY not configured");
    return null;
  }

  try {
    const res = await axios.get<GooglePlaceDetailsResponse>(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {
        params: {
          place_id: externalId,
          fields: "name,formatted_address,formatted_phone_number,international_phone_number,website,photos,opening_hours",
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    );

    if (res.data.status !== "OK" || !res.data.result) {
      console.warn(`Google Places Details API returned status: ${res.data.status}`);
      return null;
    }

    const result = res.data.result;

    // Extract phone (prefer international, fallback to formatted)
    const phone = result.international_phone_number || result.formatted_phone_number || null;

    // Extract website
    const website = result.website || null;

    // Extract photo references (not URLs - we'll generate URLs dynamically)
    const photoRefs = result.photos?.map(p => p.photo_reference) || [];

    // Determine opening status
    let openingStatus: "open" | "closed" | "unknown" = "unknown";
    if (result.opening_hours?.open_now !== undefined) {
      openingStatus = result.opening_hours.open_now ? "open" : "closed";
    }

    return {
      phone,
      website,
      photoRefs,
      openingStatus
    };
  } catch (error) {
    console.error("Error fetching place details from Google API:", error);
    return null;
  }
}

/**
 * Generate Google Places photo URL from photo reference
 */
export function generatePhotoURL(photoRef: string, maxWidth: number = 400): string {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return "";
  }
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoRef}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
}
