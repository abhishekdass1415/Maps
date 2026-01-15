import { Router } from "express";
import { prisma } from "../db";

const router = Router();

/**
 * Health check endpoint
 * Simple DB connectivity check - no Google API calls
 */
router.get("/", async (_, res) => {
  try {
    // Simple DB query to verify connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If DB check fails, return error status
    res.status(503).json({
      status: "error",
      db: "disconnected",
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
