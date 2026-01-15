import "dotenv/config";
import { PrismaClient, PlaceType } from "@prisma/client";

const prisma = new PrismaClient();

const BATCH_SIZE = 100;   // smaller
const SLEEP_MS = 50;      // give Neon breathing room

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function main() {
  console.log("🔗 Linking petrol pumps to category (safe mode)...");

  const category = await prisma.placeCategory.findUnique({
    where: { slug: "petrol-pump" }
  });

  if (!category) throw new Error("Category not found");

  // ✅ ONLY fetch pumps that are NOT linked yet
  const pumps = await prisma.place.findMany({
    where: {
      type: PlaceType.PETROL_PUMP,
      categories: {
        none: { slug: "petrol-pump" }
      }
    },
    select: { id: true }
  });

  console.log(`⛽ Remaining pumps to link: ${pumps.length}`);

  for (let i = 0; i < pumps.length; i += BATCH_SIZE) {
    const batch = pumps.slice(i, i + BATCH_SIZE);

    for (const p of batch) {
      try {
        await prisma.place.update({
          where: { id: p.id },
          data: {
            categories: {
              connect: { slug: "petrol-pump" }
            }
          }
        });
      } catch (err) {
        console.error("⚠️ Failed for ID:", p.id);
      }
    }

    console.log(`✅ Linked ${Math.min(i + BATCH_SIZE, pumps.length)} / ${pumps.length}`);
    await sleep(SLEEP_MS);
  }

  console.log("🎉 All petrol pumps linked successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
