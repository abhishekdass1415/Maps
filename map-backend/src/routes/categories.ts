import { Router } from "express";
import { prisma } from "../db";

const router = Router();

router.get("/", async (_, res) => {
  const categories = await prisma.placeCategory.findMany({
    select: {
      slug: true,
      displayName: true
    },
    orderBy: { displayName: "asc" }
  });

  res.json(categories);
});

export default router;
