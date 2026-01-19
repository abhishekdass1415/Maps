import { prisma } from "../db";
import { getPlaceDetailsFromGoogleAPI, generatePhotoURL, PlaceDetailsFromAPI } from "../providers/placeDetailsProvider";

type PlaceDetails = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  photos: string[];
  openingStatus: "open" | "closed" | "unknown";
  latitude: number;
  longitude: number;
  category: string;
  source: "db" | "api";
};

type StoredDetails = {
  phone?: string | null;
  website?: string | null;
  photoRefs?: string[];
  openingStatus?: "open" | "closed" | "unknown";
};

/**
 * Check if stored details are complete enough
 * Returns false if details are missing or all fields are empty/null
 */
function isDetailsComplete(details: StoredDetails | null): boolean {
  if (!details) return false;

  // Check if we have at least one meaningful field
  const hasPhone =
    typeof details.phone === "string" && details.phone.trim() !== "";
  const hasWebsite =
    typeof details.website === "string" && details.website.trim() !== "";
  const hasPhotos =
    Array.isArray(details.photoRefs) && details.photoRefs.length > 0;
  const hasStatus =
    typeof details.openingStatus === "string" &&
    details.openingStatus !== "unknown";

  // Consider complete if we have at least one meaningful field
  return hasPhone || hasWebsite || hasPhotos || hasStatus;
}

/**
 * Merge API details into stored details
 */
function mergeDetails(stored: StoredDetails | null, api: PlaceDetailsFromAPI): StoredDetails {
  return {
    phone: api.phone || stored?.phone || null,
    website: api.website || stored?.website || null,
    photoRefs: api.photoRefs.length > 0 ? api.photoRefs : (stored?.photoRefs || []),
    openingStatus: api.openingStatus !== "unknown" ? api.openingStatus : (stored?.openingStatus || "unknown")
  };
}

/**
 * Get place details with DB-first, API fallback logic
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  // 1. Fetch place from DB
  const place = await prisma.place.findUnique({
    where: { id: placeId },
    include: {
      categories: {
        take: 1,
        select: { slug: true }
      }
    }
  });

  if (!place) {
    return null;
  }

  // 2. Check if we have stored details
  const storedDetails = place.details as StoredDetails | null;
  const hasStoredDetails = isDetailsComplete(storedDetails);

  let finalDetails: StoredDetails;
  let source: "db" | "api" = "db";

  // 3. If missing/incomplete details and we have externalId, try API to enrich
  if (!hasStoredDetails && place.externalId) {
    const apiDetails = await getPlaceDetailsFromGoogleAPI(place.externalId);
    
    if (apiDetails) {
      source = "api";
      finalDetails = mergeDetails(storedDetails, apiDetails);
      
      // 4. Save API results to DB (non-blocking)
      prisma.place.update({
        where: { id: placeId },
        data: {
          details: finalDetails
        }
      }).catch((error) => {
        console.error(`Failed to save place details for ${placeId}:`, error);
        // Non-blocking - don't throw
      });
    } else {
      // API failed or no data - use stored or empty
      finalDetails = storedDetails || {
        phone: null,
        website: null,
        photoRefs: [],
        openingStatus: "unknown"
      };
    }
  } else {
    // Use stored details (they exist and are complete enough)
    finalDetails = storedDetails || {
      phone: null,
      website: null,
      photoRefs: [],
      openingStatus: "unknown"
    };
  }

  // 5. Generate photo URLs from references
  const photoURLs = finalDetails.photoRefs?.map(ref => generatePhotoURL(ref)) || [];

  // 6. Return unified response
  return {
    id: place.id,
    name: place.name,
    address: place.address,
    phone: finalDetails.phone || null,
    website: finalDetails.website || null,
    photos: photoURLs,
    openingStatus: finalDetails.openingStatus || "unknown",
    latitude: place.latitude,
    longitude: place.longitude,
    category: place.categories[0]?.slug || "other",
    source
  };
}
