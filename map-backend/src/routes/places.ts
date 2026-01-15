import { Router } from "express";
import { prisma } from "../db";
import { getPlacesWithFallback } from "../services/placeService";

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

/* -------------------- CITIES (UNCHANGED) -------------------- */
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

/* -------------------- SEARCH / FILTER (UNCHANGED) -------------------- */
router.get("/", async (req, res) => {
  const { category, city, state, query } = req.query;

  const places = await prisma.place.findMany({
    where: {
      isActive: true,
      city: city ? String(city) : undefined,
      state: state ? String(state) : undefined,
      name: query
        ? { contains: String(query), mode: "insensitive" }
        : undefined,
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
