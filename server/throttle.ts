import express from "express";
import { addSystemLog } from "./db.js";

interface ThrottleOptions {
  windowMs: number;
  max: number;
  message: string;
}

/**
 * Creates an in-memory sliding-window request throttling middleware.
 * Supports dual-mode throttling: identifies by authenticated user email (if available) or client IP.
 */
export function createThrottleMiddleware(options: ThrottleOptions) {
  const requestCounts = new Map<string, number[]>();

  // Prune expired entries regularly to guarantee zero memory leaks
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of requestCounts.entries()) {
      const filtered = timestamps.filter(t => now - t < options.windowMs);
      if (filtered.length === 0) {
        requestCounts.delete(key);
      } else {
        requestCounts.set(key, filtered);
      }
    }
  }, 30 * 1000); // Run garbage collection every 30 seconds

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string || req.ip || req.socket.remoteAddress || "unknown")
      .split(",")[0]
      .trim();

    // Check if user is authenticated (attached by authentication middleware) or has credentials in header/query
    const userEmail = (req as any).user?.email || req.headers["x-user-email"] || req.query.email || "";

    // Generate unique identification key for sliding window calculation
    const identifier = userEmail ? `user:${userEmail}` : `ip:${ip}`;
    const key = `${identifier}:${req.method}:${req.baseUrl || ""}${req.path}`;

    const now = Date.now();
    const timestamps = requestCounts.get(key) || [];

    // Filter down to timestamps falling entirely inside the dynamic window
    const activeTimestamps = timestamps.filter(t => now - t < options.windowMs);

    if (activeTimestamps.length >= options.max) {
      addSystemLog(
        "warn",
        `Security Throttle: Throttled potential abuse or brute-force on ${req.method} ${req.path} from client [${identifier}]. Current rate: ${activeTimestamps.length}/${options.max} requests per ${Math.round(options.windowMs / 1000)}s.`
      );
      res.status(429).json({ error: options.message });
      return;
    }

    activeTimestamps.push(now);
    requestCounts.set(key, activeTimestamps);
    next();
  };
}
