import { Request, Response, NextFunction } from "express";

/**
 * Dev-only request logging middleware
 * Logs: method, path, response time
 * Does NOT log: payloads, API keys, sensitive data
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Only log in development
  if (process.env.NODE_ENV !== "production") {
    const startTime = Date.now();
    const method = req.method;
    const path = req.path;

    // Log when response finishes
    res.on("finish", () => {
      const duration = Date.now() - startTime;
      console.log(`[${method}] ${path} - ${duration}ms`);
    });
  }

  next();
}
