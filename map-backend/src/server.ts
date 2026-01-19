import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./db";
import { requestLogger } from "./middleware/requestLogger";

import placesRouter from "./routes/places";
import categoriesRouter from "./routes/categories";
import healthRouter from "./routes/health";
import directionsRouter from "./routes/directions";

const app = express();

// app.use(cors());
app.use(
  cors({
    origin: "*"
  })
);

app.use(express.json());

// Dev-only request logging
app.use(requestLogger);

/* 🔽 DEBUG ROUTE — MUST BE HERE */
app.get("/debug/db", async (_, res) => {
  const placeCount = await prisma.place.count();
  const categoryCount = await prisma.placeCategory.count();
  res.json({ placeCount, categoryCount });
});

/* 🔽 API ROUTES */
app.use("/api/health", healthRouter);
app.use("/api/places", placesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/directions", directionsRouter);

app.get("/", (_, res) => {
  res.send("Map backend is running 🚀");
});

/* 🔽 LISTEN MUST BE LAST */
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
