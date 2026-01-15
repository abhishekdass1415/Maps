import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./db";

import placesRouter from "./routes/places";
import categoriesRouter from "./routes/categories";

const app = express();

app.use(cors());
app.use(express.json());

/* 🔽 DEBUG ROUTE — MUST BE HERE */
app.get("/debug/db", async (_, res) => {
  const placeCount = await prisma.place.count();
  const categoryCount = await prisma.placeCategory.count();
  res.json({ placeCount, categoryCount });
});

/* 🔽 API ROUTES */
app.use("/api/places", placesRouter);
app.use("/api/categories", categoriesRouter);

app.get("/", (_, res) => {
  res.send("Map backend is running 🚀");
});

/* 🔽 LISTEN MUST BE LAST */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
