import "dotenv/config";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { PrismaClient, PlaceType } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_DIR = path.join(process.cwd(), "data", "pumps");
const PROGRESS_FILE = path.join(process.cwd(), ".import-progress.json");

// ---------- helpers ----------
function titleCase(str: string) {
  return str
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function readCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

// ---------- progress ----------
type Progress = {
  section: "city" | "highway";
  state?: string;
  file?: string;
  rowIndex?: number;
};

function loadProgress(): Progress | null {
  if (!fs.existsSync(PROGRESS_FILE)) return null;
  return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
}

function saveProgress(progress: Progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function clearProgress() {
  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
}

// ---------- CITY IMPORT ----------
async function importCityPumps(progress: Progress | null) {
  const citiesDir = path.join(BASE_DIR, "cities");
  const states = fs.readdirSync(citiesDir);

  let inserted = 0;
  let skipped = 0;
  let resume = !progress || progress.section !== "city";

  for (const state of states) {
    if (!resume && state !== progress?.state) continue;
    resume = true;

    const stateDir = path.join(citiesDir, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;

    const files = fs.readdirSync(stateDir).filter(f => f.endsWith(".csv"));

    for (const file of files) {
      if (!resume && file !== progress?.file) continue;
      resume = true;

      const city = titleCase(path.basename(file, ".csv"));
      const filePath = path.join(stateDir, file);

      console.log(`🏙 State: ${state}, City: ${city}`);

      if (!fs.existsSync(filePath)) continue;

      const rows = await readCSV(filePath);

      for (let i = 0; i < rows.length; i++) {
        if (
          progress &&
          progress.section === "city" &&
          progress.state === state &&
          progress.file === file &&
          progress.rowIndex !== undefined &&
          i < progress.rowIndex
        ) {
          continue;
        }

        saveProgress({
          section: "city",
          state,
          file,
          rowIndex: i
        });

        const row = rows[i];

        try {
          if (!row.latitude || !row.longitude || !row.name) {
            skipped++;
            continue;
          }

          await prisma.place.create({
            data: {
              name: row.name,
              latitude: parseFloat(row.latitude),
              longitude: parseFloat(row.longitude),
              address: row.address || null,
              city,
              state,
              country: "India",
              type: PlaceType.PETROL_PUMP,
              source: "csv-city",
              isActive: true,
              externalId: row.place_id || null
            }
          });

          inserted++;
        } catch {
          skipped++;
        }
      }
    }
  }

  return { inserted, skipped };
}

// ---------- HIGHWAY IMPORT ----------
async function importHighwayPumps(progress: Progress | null) {
  const highwaysDir = path.join(BASE_DIR, "highways");
  const highways = fs.readdirSync(highwaysDir);

  let inserted = 0;
  let skipped = 0;

  for (const highway of highways) {
    const highwayDir = path.join(highwaysDir, highway);
    if (!fs.statSync(highwayDir).isDirectory()) continue;

    const filePath = path.join(highwayDir, "pumps.csv");
    if (!fs.existsSync(filePath)) continue;

    console.log(`🛣 Highway: ${highway}`);

    const rows = await readCSV(filePath);

    for (let i = 0; i < rows.length; i++) {
      saveProgress({
        section: "highway",
        file: highway,
        rowIndex: i
      });

      const row = rows[i];

      try {
        if (!row.latitude || !row.longitude || !row.name) {
          skipped++;
          continue;
        }

        await prisma.place.create({
          data: {
            name: row.name,
            latitude: parseFloat(row.latitude),
            longitude: parseFloat(row.longitude),
            address: `${row.address || ""} (${highway})`,
            country: "India",
            type: PlaceType.PETROL_PUMP,
            source: "csv-highway",
            isActive: true,
            externalId: row.place_id || null
          }
        });

        inserted++;
      } catch {
        skipped++;
      }
    }
  }

  return { inserted, skipped };
}

// ---------- MAIN ----------
async function main() {
  console.log("🚀 Starting CSV import (TRUE RESUME MODE)");

  const progress = loadProgress();

  if (progress) {
    console.log("🔁 Resuming from:", progress);
  }

  const cityResult = await importCityPumps(progress);
  const highwayResult = await importHighwayPumps(progress);

  clearProgress();

  console.log("✅ IMPORT FINISHED");
  console.log("City pumps:", cityResult);
  console.log("Highway pumps:", highwayResult);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
