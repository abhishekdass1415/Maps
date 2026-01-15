import { prisma } from "../db";

export async function getPlacesFromDB({
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
  const delta = radiusKm / 111;

  return prisma.place.findMany({
    where: {
      latitude: { gte: lat - delta, lte: lat + delta },
      longitude: { gte: lng - delta, lte: lng + delta },
      categories: {
        some: { slug: category }
      },
      isActive: true
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true
    },
    take: 500
  });
}
