import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.place.create({
    data: {
      name: "City Hospital Nagpur",
      type: "HOSPITAL",
      latitude: 21.1458,
      longitude: 79.0882,
      city: "Nagpur",
      state: "Maharashtra",
      source: "manual"
    }
  });

  await prisma.place.create({
    data: {
      name: "IOC Petrol Pump Sitabuldi",
      type: "PETROL_PUMP",
      latitude: 21.1492,
      longitude: 79.0835,
      city: "Nagpur",
      state: "Maharashtra",
      source: "manual"
    }
  });
  

  console.log("Sample places inserted");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
