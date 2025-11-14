// src/server.ts
import "dotenv/config";
import express, { type Request, type Response } from "express";
import { initDb, insertVisit, hasRecentVisit, pool } from "./db.js";
import type { VisitPayload } from "./types.js";
import cors from "cors";
import { logError, logToFile } from "./logger.js";

process.on("uncaughtException", (err) => {
  logError("Uncaught Exception", err);
});

process.on("unhandledRejection", (reason) => {
  logError("Unhandled Promise Rejection", reason);
});

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(
  express.json({
    limit: "10kb",
  }),
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
  }),
);

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const msg = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    console.log(msg);
    logToFile(msg);
  });

  next();
});

app.use((err: any, req: Request, res: Response, _next: any) => {
  logError(
    `Error in route ${req.method} ${req.originalUrl} from IP ${req.ip}`,
    err,
  );

  res.status(500).json({ error: "Internal Server Error" });
});

app.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post(
  "/api/stats/visit",
  async (req: Request<{}, {}, VisitPayload>, res: Response) => {
    // --- API KEY REQUIRED ---
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // -------------------------

    const { postId, path, postTitle, referrer, userAgent } = req.body ?? {};

    if (
      (typeof postId !== "string" && typeof postId !== "number") ||
      typeof path !== "string" ||
      path.length === 0 ||
      typeof postTitle !== "string" ||
      postTitle.length === 0
    ) {
      return res.status(400).json({
        error: "postId, path and postTitle are required non-empty strings",
      });
    }

    const resolvedReferrer =
      typeof referrer === "string" && referrer.length > 0
        ? referrer
        : req.get("referer") || null;

    const resolvedUserAgent =
      typeof userAgent === "string" && userAgent.length > 0
        ? userAgent
        : req.get("user-agent") || null;

    const ip = req.ip || null;

    // 👇 do NOT count a new visit if same IP hit same post in last 1 minute
    if (await hasRecentVisit(postId, ip)) {
      return res.sendStatus(204); // silently accept but don't insert
    }

    try {
      await insertVisit(
        String(postId),
        path,
        postTitle,
        resolvedReferrer,
        resolvedUserAgent,
        ip,
      );
      logToFile(
        `Inserted visit for postId=${postId} postTitle=${postTitle} from IP=${ip}`,
      );
      return res.sendStatus(201);
    } catch (err) {
      console.error("Error inserting visit", err);
      logError(`Failed to insert visit for postId=${postId}`, err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

app.get("/api/stats/:postId", async (req: Request, res: Response) => {
  const postId = req.params.postId;
  if (!postId) {
    return res.status(400).json({ error: "postId required" });
  }

  const ip = req.ip || null;

  try {
    const [total, uniqueIps, last7days, last24h, yourVisits] =
      await Promise.all([
        pool.query(
          "SELECT COUNT(*)::int AS count FROM visits WHERE post_id = $1",
          [postId],
        ),
        pool.query(
          "SELECT COUNT(DISTINCT ip)::int AS count FROM visits WHERE post_id = $1",
          [postId],
        ),
        pool.query(
          "SELECT COUNT(*)::int AS count FROM visits WHERE post_id = $1 AND created_at >= NOW() - INTERVAL '7 days'",
          [postId],
        ),
        pool.query(
          "SELECT COUNT(*)::int AS count FROM visits WHERE post_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'",
          [postId],
        ),
        ip
          ? pool.query(
              "SELECT COUNT(*)::int AS count FROM visits WHERE post_id = $1 AND ip = $2",
              [postId, ip],
            )
          : Promise.resolve({ rows: [{ count: 0 }] } as any),
      ]);

    return res.json({
      postId,
      totalVisits: total.rows[0].count,
      uniqueVisitors: uniqueIps.rows[0].count,
      last7days: last7days.rows[0].count,
      last24h: last24h.rows[0].count,
      yourVisits: yourVisits.rows[0].count, // návštěvy z aktuální IP
    });
  } catch (err) {
    console.error("Error reading stats:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = Number(process.env.PORT) || 8080;

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
