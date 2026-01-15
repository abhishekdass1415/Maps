import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const place = await prisma.place.findFirst({
    where: { name: "City Hospital Nagpur" }
  });

  if (!place) {
    console.log("Place not found");
    return;
  }

  await prisma.place.update({
    where: { id: place.id },
    data: {
      categories: {
        connect: { slug: "hospital" }
      }
    }
  });

  console.log("✅ Category linked");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
