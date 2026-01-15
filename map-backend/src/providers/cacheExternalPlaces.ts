import { prisma } from "../db";

export async function cacheExternalPlaces(
  places: {
    externalId: string;
    name: string;
    latitude: number;
    longitude: number;
    address?: string | null;
    source: string;
  }[],
  categorySlug: string
) {
  for (const p of places) {
    await prisma.place.upsert({
      where: { externalId: p.externalId },
      update: {},
      create: {
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        address: p.address ?? undefined,
        source: p.source,
        type: "OTHER",
        categories: {
          connect: { slug: categorySlug }
        }
      }
    });
  }
}
