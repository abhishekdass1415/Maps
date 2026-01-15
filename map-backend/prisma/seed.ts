import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { slug: "petrol-pump", displayName: "Petrol Pump" },
    { slug: "ev-charger", displayName: "EV Charger" },
    { slug: "public-toilet", displayName: "Public Toilet" },
    { slug: "hospital", displayName: "Hospital" },
    { slug: "restaurant", displayName: "Restaurant" },
    { slug: "cafe", displayName: "Cafe" },
    { slug: "atm", displayName: "ATM" },
    { slug: "parking", displayName: "Parking" },
    { slug: "police-station", displayName: "Police Station" },
    { slug: "fire-station", displayName: "Fire Station" }
  ];

  for (const c of categories) {
    await prisma.placeCategory.upsert({
      where: { slug: c.slug },
      update: {},
      create: c
    });
  }

  console.log("✅ PlaceCategory seeded");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
