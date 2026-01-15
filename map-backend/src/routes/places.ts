import { Router } from "express";
import { prisma } from "../db";
import { getPlacesWithFallback } from "../services/placeService";
import { smartSearch } from "../services/searchService";

const router = Router();

/* -------------------- NEARBY (UPDATED) -------------------- */
router.get("/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radius ?? 5);
  const category = String(req.query.category ?? "");

  if (!lat || !lng || !category) {
    return res.status(400).json({
      error: "lat, lng, category required"
    });
  }

  const result = await getPlacesWithFallback({
    lat,
    lng,
    radiusKm,
    category
  });

  res.json(result);
});

/* -------------------- CITIES -------------------- */
router.get("/cities", async (_, res) => {
  const cities = await prisma.place.findMany({
    where: {
      city: { not: null }
    },
    distinct: ["city"],
    select: { city: true },
    orderBy: { city: "asc" }
  });

  res.json(cities.map(c => c.city));
});

/* -------------------- CITY COORDINATES -------------------- */
router.get("/city/:cityName/coordinates", async (req, res) => {
  const cityName = req.params.cityName;
  
  const places = await prisma.place.findMany({
    where: {
      city: { contains: cityName, mode: "insensitive" },
      isActive: true
    },
    select: {
      latitude: true,
      longitude: true
    },
    take: 100
  });

  if (places.length === 0) {
    return res.status(404).json({ error: "City not found" });
  }

  // Calculate center point (average of coordinates)
  const avgLat = places.reduce((sum, p) => sum + p.latitude, 0) / places.length;
  const avgLng = places.reduce((sum, p) => sum + p.longitude, 0) / places.length;

  res.json({
    city: cityName,
    latitude: avgLat,
    longitude: avgLng
  });
});

/* -------------------- SEARCH / FILTER (ENHANCED WITH SMART SEARCH) -------------------- */
router.get("/", async (req, res) => {
  const { category, city, state, query, lat, lng } = req.query;

  // If query param exists, use smart search with API fallback
  if (query) {
    try {
      const places = await smartSearch({
        query: String(query),
        category: category ? String(category) : undefined,
        city: city ? String(city) : undefined,
        state: state ? String(state) : undefined,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined
      });

      return res.json(places);
    } catch (error) {
      console.error("Smart search error:", error);
      // Fall back to basic DB search on error
    }
  }

  // Otherwise, use existing filter logic (backward compatible)
  const places = await prisma.place.findMany({
    where: {
      isActive: true,
      city: city ? String(city) : undefined,
      state: state ? String(state) : undefined,
      categories: category
        ? {
            some: {
              slug: String(category)
            }
          }
        : undefined
    },
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

  res.json(places);
});

export default router;
